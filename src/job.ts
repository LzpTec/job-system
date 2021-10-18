import { Transferable } from '.';
import { SerializableValue } from './types-utility';

export interface Job<T, D extends SerializableValue = any> {
    transfer?: Transferable[];
}

export abstract class Job<T, D extends SerializableValue = any> {
    data!: D;
    abstract execute(): T | Promise<T>;
}
