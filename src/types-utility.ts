import { MessagePort } from 'worker_threads';

// Serializable Types of Data, to use with the Worker.
export type SerializableValue =
    | string
    | number
    | boolean
    | null
    | ArrayBuffer
    | SharedArrayBuffer
    | MessagePort
    | Date
    | RegExp
    | Map<SerializableValue, SerializableValue>
    | Set<SerializableValue>
    | SerializableValue[]
    | { [key: string]: SerializableValue };

export type Transferable = (ArrayBuffer | MessagePort);