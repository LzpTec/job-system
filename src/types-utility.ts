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

// https://stackoverflow.com/a/61076348
type Impossible<K extends keyof any> = {
    [P in K]: never;
};

export type NoExtraProperties<T, U extends T = T> = U extends Array<infer V>
    ? NoExtraProperties<V>[]
    : U & Impossible<Exclude<keyof U, keyof T>>;