import { MessagePort } from 'worker_threads';

// Serializable Types of Data, to use with the Worker.
export type SerializableValue =
    | string
    | number
    | boolean
    | null
    | Buffer
    | ArrayBufferLike
    | MessagePort
    | DataView
    | Date
    | RegExp
    | Map<SerializableValue, SerializableValue>
    | Set<SerializableValue>
    | SerializableValue[]
    | { [key: string]: SerializableValue };
