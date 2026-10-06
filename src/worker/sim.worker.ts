import { SimHost } from './host';
import type { FromWorker, ToWorker } from './protocol';

const TICK_MS = 50;

const scope = self as unknown as {
  postMessage(msg: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

const host = new SimHost(
  (msg) => scope.postMessage(msg),
  () => performance.now(),
);

scope.onmessage = (e) => host.handle(e.data);
setInterval(() => host.tick(), TICK_MS);
