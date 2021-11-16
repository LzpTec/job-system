import { once } from 'events';
import { TypedEmitter } from 'tiny-typed-emitter';
import { jobStateChange } from './constants';
import { JobState } from './job-state';
import { JobEvents } from './types/job-events';

/**
 * Job Handle.
 */
export class JobHandle<T> extends TypedEmitter<JobEvents> {
    #state: JobState = JobState.PENDING;
    #result?: T;
    #error?: any;

    constructor() {
        super();
        this.on(jobStateChange, (state, data) => this.#updateState(state, data));
    }

    #updateState(state: JobState, data: any) {
        this.#state = state;
        if (this.#state === JobState.SUCCEEDED) {
            this.#result = data;
            this.emit('complete', undefined, data);
            this.emit('success', data);
        }

        if (this.#state === JobState.FAILED) {
            this.#error = data;
            this.emit('complete', data);
            this.emit('error', data);
        }
    }

    /**
     * Wait the job to complete
     * @returns A Promise that resolves when the job is completed.
     */
    public async complete() {
        if (this.#result)
            return this.#result;

        if (this.#error)
            throw this.#error;

        return once(this, 'complete')
            .then(([err, data]) => {
                if (err)
                    throw err;

                return data;
            });
    }

    /**
     * Job State.
     * 
     * @returns the current job state.
     */
    public get state() {
        return this.#state;
    }
}
