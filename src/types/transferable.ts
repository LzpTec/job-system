import { MessagePort } from 'worker_threads';

export type Transferable = (ArrayBufferLike | MessagePort);
