import { jobStateChange } from './constants';
import { JobHandle } from './job-handle';
import { JobState } from './job-state';

export class MainThread {
    static #active: number = 0;

    static async run<T = any, D = any>(
        jobHandle: JobHandle<T>,
        job: (data?: D) => T | Promise<T>,
        data?: D
    ) {
        this.#active++;
        try {
            const response = job.bind(null)(data);
            jobHandle.emit(jobStateChange, JobState.RUNNING);
            const res = await response;
            jobHandle.emit(jobStateChange, JobState.SUCCEEDED, res as T);
        } catch (err) {
            jobHandle.emit(jobStateChange, JobState.FAILED, err);
        } finally {
            this.#active--;
        }
    }

    public static get active() {
        return this.#active;
    }
}