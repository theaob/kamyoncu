import { create } from 'zustand';
import type { Command, SimEvent } from '../core/types';
import { startSimWorker, type SimClient } from '../worker/client';
import type { ClockView, FromWorker } from '../worker/protocol';

const LOG_LIMIT = 30;

export interface LogEntry {
  id: number;
  time: number;
  event: SimEvent;
}

interface GameStore {
  ready: boolean;
  worldId: string | null;
  clock: ClockView;
  log: LogEntry[];
  send(command: Command): void;
  receive(msg: FromWorker): void;
}

let client: SimClient | null = null;
let logId = 0;

export const useGameStore = create<GameStore>((set) => ({
  ready: false,
  worldId: null,
  clock: { time: 0, speed: 1, paused: true },
  log: [],
  send: (command) => client?.send(command),
  receive: (msg) => {
    if (msg.type === 'ready') {
      set({ ready: true, worldId: msg.worldId, clock: msg.clock });
      return;
    }
    set((s) => ({
      clock: msg.clock,
      log:
        msg.events.length === 0
          ? s.log
          : [
              ...msg.events.map((event) => ({ id: ++logId, time: msg.clock.time, event })),
              ...s.log,
            ].slice(0, LOG_LIMIT),
    }));
  },
}));

/** Simülasyon worker'ını bir kez başlatır (React StrictMode çift çağrısına dayanıklı). */
export function ensureSimStarted(seed = Date.now() % 2147483647): void {
  if (client) return;
  client = startSimWorker(seed, (msg) => useGameStore.getState().receive(msg));
}
