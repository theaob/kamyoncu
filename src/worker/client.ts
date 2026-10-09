import type { Command } from '../core/types';
import type { FromWorker, ToWorker } from './protocol';

export interface SimClient {
  send(command: Command): void;
  newGame(seed: number): void;
  requestSave(): void;
  setAutoPause(on: boolean): void;
  dispose(): void;
}

export function startSimWorker(
  seed: number,
  save: string | null,
  autoPause: boolean,
  onMessage: (msg: FromWorker) => void,
): SimClient {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
  const post = (msg: ToWorker) => worker.postMessage(msg);
  worker.onmessage = (e: MessageEvent<FromWorker>) => onMessage(e.data);
  post({ type: 'init', seed, save, autoPause });
  return {
    send: (command) => post({ type: 'command', command }),
    newGame: (newSeed) => post({ type: 'newGame', seed: newSeed }),
    requestSave: () => post({ type: 'save' }),
    setAutoPause: (on) => post({ type: 'setAutoPause', on }),
    dispose: () => worker.terminate(),
  };
}
