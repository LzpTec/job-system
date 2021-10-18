import EventEmitter from 'events';
import type TypedEmitter from 'typed-emitter';
import { JobEvents, jobStateChange } from './constants';
import { JobState } from './job-state';
import { Deferred } from './utils/deferred';

/**
 * Job Handle.
 */
export class JobHandle<T> {
    #state: JobState = JobState.PENDING;

    readonly #stream: TypedEmitter<JobEvents>;
    readonly #complete: Deferred<T> = new Deferred();

    #result?: T;
    #error?: any;

    constructor(stream: EventEmitter) {
        this.#stream = stream;
        this.#stream.on(jobStateChange, this.#updateState.bind(this));
    }

    #updateState(state: JobState, data: any) {
        this.#state = state;
        if (this.#state === JobState.SUCCEEDED) {
            this.#result = data;
            this.#complete.resolve(data);
        }

        if (this.#state === JobState.FAILED) {
            this.#error = data;
            this.#complete.reject(data);
        }
    }

    /**
     * Wait the job to complete
     * @returns A Promise that resolves when the job is completed.
     */
    public async complete() {
        return this.#complete.toPromise();
    }

    /**
     * Job State.
     * 
     * @returns the current job state.
     */
    public get state() {
        return this.#state;
    }

    /**
     * Is Completed.
     * 
     * @returns true if the job is completed.
     * @deprecated Use .state instead.
     */
    public get isCompleted() {
        return this.#state === JobState.SUCCEEDED || this.#state === JobState.FAILED;
    }
}