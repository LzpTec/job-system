import { SerializableValue } from './types/serializable-value';
import { Transferable } from './types/transferable';

export interface Job<T, D extends SerializableValue = any> {
    transfer?: Transferable[];
}

export abstract class Job<T, D extends SerializableValue = any> {
    data!: D;
    abstract execute(): T | Promise<T>;
}
