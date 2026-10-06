import type { Command } from '../core/types';
import type { FromWorker, ToWorker } from './protocol';

export interface SimClient {
  send(command: Command): void;
  dispose(): void;
}

export function startSimWorker(seed: number, onMessage: (msg: FromWorker) => void): SimClient {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
  const post = (msg: ToWorker) => worker.postMessage(msg);
  worker.onmessage = (e: MessageEvent<FromWorker>) => onMessage(e.data);
  post({ type: 'init', seed });
  return {
    send: (command) => post({ type: 'command', command }),
    dispose: () => worker.terminate(),
  };
}
