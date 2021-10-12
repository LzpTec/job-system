import { Transferable } from '.';
import { SerializableValue } from './types-utility';

export interface Job<T> {
    transfer?: Transferable[];
}

export abstract class Job<T> {
    abstract data: SerializableValue;
    abstract execute(): T | Promise<T>;
}