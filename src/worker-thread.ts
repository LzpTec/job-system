import { EventEmitter, once } from 'events';
import { Worker } from 'worker_threads';
import { jobStateChange } from './constants';
import { JobHandle } from './job-handle';
import { JobState } from './job-state';
import { Transferable } from './types/transferable';

export class WorkerThread extends EventEmitter {
    instance: Worker;
    active: number = 0;
    timeout?: NodeJS.Timeout;

    #id: number;
    #jobCount: number = 0;

    constructor(id: number, instance: Worker) {
        super();
        this.#id = id;
        this.instance = instance;
    }

    public getUid() {
        this.#jobCount++;
        return `${this.#id}-${this.#jobCount.toString(36)}`;
    }

    public async run<T = any, D = any>(
        jobHandle: JobHandle<T>,
        job: (data?: D) => T | Promise<T>,
        data?: D,
        transferList?: Transferable[]
    ) {
        const uid = this.getUid();
        const handler = `(${job.toString()})`;

        try {
            this.instance.postMessage({
                uid,
                handler,
                data
            }, transferList);

            jobHandle.emit(jobStateChange, JobState.RUNNING);

            const [res] = await once(this, `uid-${uid}`);
            if (res.error)
                throw res.error;

            return jobHandle.emit(jobStateChange, JobState.SUCCEEDED, res.response as T);
        } catch (err) {
            jobHandle.emit(jobStateChange, JobState.FAILED, err);
        }
    }
}