import { create } from 'zustand';
import type { SaveError } from '../core/save';
import { createFinance } from '../core/ledger';
import type { Command, SimEvent } from '../core/types';
import { startSimWorker, type SimClient } from '../worker/client';
import type { ClockView, FromWorker, GameView } from '../worker/protocol';
import { backupSave, readAutoPause, readSave, writeAutoPause, writeSave } from './persistence';

const LOG_LIMIT = 30;

export interface LogEntry {
  id: number;
  time: number;
  event: SimEvent;
}

interface GameStore extends GameView {
  ready: boolean;
  worldId: string | null;
  clock: ClockView;
  log: LogEntry[];
  loadError: SaveError | null;
  /** Son başarılı otomatik kaydın oyun zamanı. */
  savedAt: number | null;
  /** Depolama kapalı ya da dolu: kayıt yazılamadı. */
  saveFailed: boolean;
  /** Haritada rotası vurgulanan ilan (üzerine gelinen/seçilen). */
  highlightJobId: string | null;
  /** Panellerde ve haritada seçili araç. */
  selectedTruckId: string | null;
  /** Araç boşa çıkınca ya da bakım isteyince oyunu duraklat. */
  autoPause: boolean;
  setAutoPause(on: boolean): void;
  send(command: Command): void;
  newGame(): void;
  dismissLoadError(): void;
  setHighlightJob(id: string | null): void;
  selectTruck(id: string): void;
  receive(msg: FromWorker): void;
}

let client: SimClient | null = null;
let logId = 0;

const randomSeed = () => Date.now() % 2147483647;

export const useGameStore = create<GameStore>((set, get) => ({
  ready: false,
  worldId: null,
  clock: { time: 0, speed: 1, paused: true },
  log: [],
  money: 0,
  trucks: [],
  trailers: [],
  drivers: [],
  jobs: [],
  candidates: [],
  usedListings: [],
  finance: createFinance(),
  loadError: null,
  savedAt: null,
  saveFailed: false,
  highlightJobId: null,
  selectedTruckId: null,
  autoPause: readAutoPause(),
  setAutoPause: (on) => {
    writeAutoPause(on);
    client?.setAutoPause(on);
    set({ autoPause: on });
  },
  send: (command) => client?.send(command),
  newGame: () => client?.newGame(randomSeed()),
  dismissLoadError: () => set({ loadError: null }),
  setHighlightJob: (id) => set({ highlightJobId: id }),
  selectTruck: (id) => set({ selectedTruckId: id }),
  receive: (msg) => {
    switch (msg.type) {
      case 'ready':
        if (msg.loadError) backupSave();
        set({
          ready: true,
          worldId: msg.worldId,
          clock: msg.clock,
          ...msg.view,
          log: [],
          loadError: msg.loadError ?? null,
          highlightJobId: null,
          selectedTruckId: msg.view.trucks[0]?.id ?? null,
        });
        return;
      case 'save':
        if (writeSave(msg.data)) set({ savedAt: get().clock.time, saveFailed: false });
        else set({ saveFailed: true });
        return;
      case 'tick':
        set((s) => ({
          clock: msg.clock,
          ...msg.view,
          // Satılan araç seçiliyse ilk araca dön.
          selectedTruckId: msg.view.trucks.some((t) => t.id === s.selectedTruckId)
            ? s.selectedTruckId
            : (msg.view.trucks[0]?.id ?? null),
          log:
            msg.events.length === 0
              ? s.log
              : [
                  ...msg.events.map((event) => ({ id: ++logId, time: msg.clock.time, event })),
                  ...s.log,
                ].slice(0, LOG_LIMIT),
        }));
        return;
    }
  },
}));

/** Seçili araç (yoksa ilki). */
export function useSelectedTruck() {
  return useGameStore((s) => s.trucks.find((t) => t.id === s.selectedTruckId) ?? s.trucks[0]);
}

/** Simülasyon worker'ını bir kez başlatır (React StrictMode çift çağrısına dayanıklı). */
export function ensureSimStarted(seed = randomSeed()): void {
  if (client) return;
  client = startSimWorker(seed, readSave(), useGameStore.getState().autoPause, (msg) =>
    useGameStore.getState().receive(msg),
  );
  // Sekme kapanırken/arka plana geçerken son durumu kaydet.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') client?.requestSave();
  });
}
