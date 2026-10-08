import { SimRunner } from '../core/runner';
import { deserialize, SaveLoadError, serialize, type SaveError } from '../core/save';
import { createInitialState } from '../core/sim';
import type { Candidate, Job, Money, SimEvent, UsedListing } from '../core/types';
import type { FromWorker, ToWorker } from './protocol';

/** Otomatik kayıt aralığı, gerçek ms. */
export const AUTOSAVE_MS = 10_000;

/**
 * Worker içindeki simülasyon döngüsü. Worker API'sinden bağımsız yazıldı;
 * `post` ve `now` dışarıdan verilir, böylece testte doğrudan çalıştırılabilir.
 */
export class SimHost {
  private runner: SimRunner | null = null;
  private last = 0;
  private lastSave = 0;
  private dirty = false;
  private sentJobs: Job[] | null = null;
  private sentMoney: Money | null = null;
  private sentCandidates: Candidate[] | null = null;
  private sentListings: UsedListing[] | null = null;

  constructor(
    private readonly post: (msg: FromWorker) => void,
    private readonly now: () => number,
  ) {}

  handle(msg: ToWorker): void {
    switch (msg.type) {
      case 'init': {
        let loadError: SaveError | undefined;
        let state = null;
        if (msg.save) {
          try {
            state = deserialize(msg.save);
          } catch (e) {
            loadError = e instanceof SaveLoadError ? e.reason : 'corrupt';
          }
        }
        this.start(state ?? createInitialState(msg.seed), loadError);
        return;
      }
      case 'newGame':
        this.start(createInitialState(msg.seed));
        this.save();
        return;
      case 'save':
        this.save();
        return;
      case 'command': {
        if (!this.runner) return;
        const events: SimEvent[] = [];
        this.runner.apply(msg.command, events);
        this.dirty = true;
        this.postTick(events);
        // Kabul ve alım-satım gibi kalıcı kararlar hemen kaydedilir.
        if (!['setSpeed', 'setPaused', 'togglePause'].includes(msg.command.type)) this.save();
        return;
      }
    }
  }

  /** Periyodik olarak çağrılır; zaman ilerlediyse arayüze bildirir. */
  tick(): void {
    if (!this.runner) return;
    const now = this.now();
    const before = this.runner.state.time;
    const events = this.runner.advance(now - this.last);
    this.last = now;
    if (this.runner.state.time !== before || events.length > 0) {
      this.dirty = true;
      this.postTick(events);
    }
    const delivered = events.some((e) => e.code.startsWith('job.delivered'));
    if (this.dirty && (delivered || now - this.lastSave >= AUTOSAVE_MS)) this.save();
  }

  private start(state: ReturnType<typeof createInitialState>, loadError?: SaveError): void {
    this.runner = new SimRunner(state);
    this.last = this.now();
    this.lastSave = this.last;
    this.dirty = false;
    this.sentJobs = state.jobs;
    this.sentMoney = state.money;
    this.sentCandidates = state.candidates;
    this.sentListings = state.usedListings;
    this.post({
      type: 'ready',
      worldId: state.activeWorldId,
      clock: this.clock(),
      view: {
        money: state.money,
        trucks: state.trucks,
        trailers: state.trailers,
        drivers: state.drivers,
        jobs: state.jobs,
        candidates: state.candidates,
        usedListings: state.usedListings,
        finance: state.finance,
      },
      ...(loadError ? { loadError } : {}),
    });
  }

  private save(): void {
    if (!this.runner) return;
    this.lastSave = this.now();
    this.dirty = false;
    this.post({ type: 'save', data: serialize(this.runner.state) });
  }

  private postTick(events: SimEvent[]): void {
    const s = this.runner!.state;
    const view: Extract<FromWorker, { type: 'tick' }>['view'] = {
      money: s.money,
      trucks: s.trucks,
      trailers: s.trailers,
      drivers: s.drivers,
    };
    // Yük borsası her değişiklikte yeni dizi olarak atanır; referans karşılaştırması yeterli.
    if (s.jobs !== this.sentJobs) {
      view.jobs = s.jobs;
      this.sentJobs = s.jobs;
    }
    // Pazar listeleri de değişince yeni dizi olarak atanır.
    if (s.candidates !== this.sentCandidates) {
      view.candidates = s.candidates;
      this.sentCandidates = s.candidates;
    }
    if (s.usedListings !== this.sentListings) {
      view.usedListings = s.usedListings;
      this.sentListings = s.usedListings;
    }
    // Finans dökümü yalnızca nakit hareketiyle değişir.
    if (s.money !== this.sentMoney) {
      view.finance = s.finance;
      this.sentMoney = s.money;
    }
    this.post({ type: 'tick', clock: this.clock(), events, view });
  }

  private clock() {
    const s = this.runner!.state;
    return { time: s.time, speed: s.speed, paused: s.paused };
  }
}
