import { once } from 'events';
import { TypedEmitter } from 'tiny-typed-emitter';
import { JobEvents, jobStateChange } from './constants';
import { JobState } from './job-state';

/**
 * Job Handle.
 */
export class JobHandle<T> extends TypedEmitter<JobEvents> {
    #state: JobState = JobState.PENDING;

    #result?: T;
    #error?: any;

    constructor() {
        super();
        this.on(jobStateChange, this.#updateState.bind(this));
    }

    #updateState(state: JobState, data: any) {
        this.#state = state;
        if (this.#state === JobState.SUCCEEDED) {
            this.#result = data;
            this.emit('complete', undefined, data);
        }

        if (this.#state === JobState.FAILED) {
            this.#error = data;
            this.emit('complete', data);
        }
    }

    /**
     * Wait the job to complete
     * @returns A Promise that resolves when the job is completed.
     */
    public async complete() {
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
