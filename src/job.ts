import { Transferable } from '.';
import { SerializableValue } from './utils/types-utility';

export interface Job<T, D extends SerializableValue = any> {
    transfer?: Transferable[];
}

export abstract class Job<T, D extends SerializableValue = any> {
    data!: D;
    abstract execute(): T | Promise<T>;
}
