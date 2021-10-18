export class Deferred<T>{
    #resolve!: (value: T) => void;
    #reject!: (reason?: any) => void;
    #promise: Promise<T>;

    constructor() {
        this.#promise = new Promise<T>((resolve, reject) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
    }

    resolve(value: T) {
        return this.#resolve(value);
    }

    reject(reason?: any) {
        return this.#reject(reason);
    }

    toPromise() {
        return new Promise<T>((resolve, reject) => this.#promise.then(resolve).catch(reject));
    }
}
