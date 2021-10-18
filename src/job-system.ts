import { EventEmitter, once } from 'events';
import os from 'os';
import * as path from 'path';
import type TypedEmitter from 'typed-emitter';
import { Worker } from 'worker_threads';
import { Job } from './job';
import { JobState } from './job-state';
import { SerializableValue, Transferable } from './types-utility';
import { Deferred } from './utils/deferred';

// TODO: Add .on method to the JobHandle<T>
// TODO: Add .off method to the JobHandle<T>
// TODO: Separate ThreadPool from JobSystem, this will allow diferent Pools(Fixed, Dynamic).
// TODO: Add ChangeSettings method to JobSystem.
// TODO: Move Worker and ThreadPool to another file.

const jobStateChange = Symbol('jobStateChange');

/**
 * Job System Settings interface.
 */
export interface JobSystemSetting {
    /**
     * Defines the maximum number of workers the Job System can instantiate.
     */
    maxWorkers?: number;

    /**
     * Defines the minimum number of workers the Job System will instantiate on startup.
     */
    minWorkers?: number;

    /**
     * Defines the maximum idle time of a worker inside the pool, after this time the worker will be terminated.
     * 
     * The timer resets if a new work is schedule to that worker.
     */
    idleTimeout?: number;

    /**
     * Use the main thread if no worker is available.
     */
    useMainThread?: boolean;
}

class JobWorker {
    instance: Worker;
    active: number = 0;
    timeout?: NodeJS.Timeout;

    #id: number;
    #jobCount: number = 0;

    constructor(id: number, instance: Worker) {
        this.#id = id;
        this.instance = instance;
    }

    public getUid() {
        this.#jobCount++;
        return `${this.#id}-${this.#jobCount.toString(36)}`;
    }
}

interface InternalJobEvents {
    [jobStateChange]: (state: JobState, data?: any) => void
}

/**
 * Job Handle.
 */
export class JobHandle<T> {
    #state: JobState = JobState.PENDING;

    readonly #stream: TypedEmitter<InternalJobEvents>;
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

const cpuSize = os.cpus().length;

/**
 * Job System main class.
 */
export class JobSystem {
    #eventStream = new EventEmitter();
    #pool: JobWorker[] = [];
    #poolSettings: JobSystemSetting = {
        maxWorkers: Math.max(1, cpuSize >= 6 ? (cpuSize / 2) : cpuSize - 1),
        minWorkers: 0,
        idleTimeout: 0,
        useMainThread: false
    };
    #poolCount: number = 0;
    #active: number = 0;
    #isTerminated: boolean = false;
    #mainThreadActive: number = 0;

    /**
     * Create a new Job System.
     * 
     * @param settings Job System Settings.
     */
    constructor(settings?: JobSystemSetting) {
        Object.assign(this.#poolSettings, settings);

        if (typeof this.#poolSettings.maxWorkers !== "number" || typeof this.#poolSettings.minWorkers !== "number")
            throw new Error('minWorkers and maxWorkers must be numbers!');

        if (typeof this.#poolSettings.idleTimeout !== "number")
            throw new Error('idleTimeout must be a number!');

        if (typeof this.#poolSettings.useMainThread !== "boolean")
            throw new Error('runOnMainThread must be a boolean!');

        if (this.#poolSettings.maxWorkers <= 0)
            throw new Error('maxWorkers must be at least 1!');

        if (this.#poolSettings.minWorkers >= this.#poolSettings.maxWorkers)
            this.#poolSettings.minWorkers = this.#poolSettings.maxWorkers;

        // Spawn initial workers
        for (let i = 0; i < this.#poolSettings.minWorkers; i++) {
            this.#spawnWorker();
        }
    }

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * 
     * @returns Job Handle.
     */
    schedule<T = any>(
        job: () => T | Promise<T>
    ): JobHandle<T>;

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * 
     * @returns Job Handle.
     */
    schedule<T = any>(
        job: Job<T>
    ): JobHandle<T>;

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * @param dependencies A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.
     * 
     * @returns Job Handle.
     */
    schedule<T = any>(
        job: Job<T>,
        dependencies: JobHandle<any>[]
    ): JobHandle<T>;

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * @param data data to worker(Needs to be serializable).
     * 
     * @returns Job Handle.
     */
    schedule<T = any, D extends SerializableValue = any>(
        job: (data: D) => T | Promise<T>,
        data: D
    ): JobHandle<T>;

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * @param data data to worker(Needs to be serializable).
     * @param transferList list of transferable objects like ArrayBuffers to be transferred to the receiving worker thread.
     * 
     * @returns Job Handle.
     */
    schedule<T = any, D extends SerializableValue = any>(
        job: (data: D) => T | Promise<T>,
        data: D,
        transferList: Transferable[]
    ): JobHandle<T>;

    public schedule<T = any, D extends SerializableValue = any>(
        job: ((data?: D) => T | Promise<T>) | Job<T>,
        data?: D | JobHandle<any>[],
        transferList?: Transferable[]
    ): JobHandle<T> {
        const isUsingJob = job instanceof Job;

        if (this.#isTerminated)
            throw new Error("This Job System is shutdown!");

        if (typeof job !== "function" && !isUsingJob)
            throw new Error("Job parameter must be a function or a Job Instance");

        const promises = (isUsingJob && Array.isArray(data)) ? data.map(async x => {
            if (x instanceof JobHandle)
                return x.complete();

            return;
        }) : undefined;

        const dependency = (promises ? Promise.all(promises) : Promise.resolve());

        const stream = new EventEmitter() as TypedEmitter<InternalJobEvents>;

        dependency
            .then(() => {
                const worker = this.#selectWorker();

                if (!worker) {
                    this.#runOnMainThread(stream, job, data as D)
                        .finally(() => this.#checkCompletion());
                    return;
                }

                this.#runOnWorker(stream, worker, job, data, transferList)
                    .finally(() => {
                        this.#checkWorker(worker);
                        this.#checkCompletion();
                    });
            });

        return new JobHandle<T>(stream);
    }

    async #checkCompletion() {
        if (this.#active === 0)
            this.#eventStream.emit('empty');
    }

    /**
     * Wait for all jobs to complete.
     * 
     * @returns A Promise that resolves when all jobs are completed.
     */
    public async complete(): Promise<void> {
        if (this.#active > 0)
            await once(this.#eventStream, 'empty');

        return;
    }

    /**
     * Shutdown the Job System.
     * 
     * @param waitForComplete Wait all schedule jobs to complete before shutdown.
     */
    public async shutdown(waitForComplete?: boolean) {
        const isTerminated = this.#isTerminated;
        this.#isTerminated = true;

        // Hack for complete.
        if (waitForComplete) {
            await this.complete();
            await this.complete();
        }

        if (isTerminated)
            return;

        await Promise.all(
            this.#pool.map(async ({ instance }) => {
                return instance.terminate();
            })
        );

        return;
    };

    async #runOnMainThread<T = any, D = any>(
        stream: TypedEmitter<InternalJobEvents>,
        job: ((data?: D) => T | Promise<T>) | Job<T>,
        data?: D
    ) {
        this.#active++;
        this.#mainThreadActive++;
        try {
            const response = ((job instanceof Job) ? job.execute() : job(data));
            stream.emit(jobStateChange, JobState.RUNNING);
            stream.emit(jobStateChange, JobState.RUNNING, (await response) as T);
        } catch (err) {
            stream.emit(jobStateChange, JobState.FAILED, err);
        } finally {
            this.#active--;
            this.#mainThreadActive--;
        }
    }

    async #runOnWorker<T = any, D = any>(
        stream: TypedEmitter<InternalJobEvents>,
        worker: JobWorker,
        job: ((data?: D) => T | Promise<T>) | Job<T>,
        data?: D | JobHandle<any>[],
        transferList?: Transferable[],
    ) {
        const isUsingJob = job instanceof Job;
        const uid = worker.getUid();

        let handler: string;
        if (isUsingJob) {
            let fn = job.execute.toString();
            fn = `function () ${fn.slice(fn.indexOf("{"), fn.lastIndexOf("}") + 1)}`;
            handler = `(async data => await (${fn}).apply(data))`;
        } else {
            handler = `(${job.toString()})`;
        }

        this.#active++;
        worker.active++;
        try {
            worker.instance.postMessage({
                uid,
                handler,
                data: isUsingJob ? { data: job.data } : data
            }, isUsingJob ? job.transfer : transferList);

            stream.emit(jobStateChange, JobState.RUNNING);

            const [res] = await once(this.#eventStream, `uid-${uid}`);
            if (res.error)
                throw res.error;

            return stream.emit(jobStateChange, JobState.SUCCEEDED, res.response as T);
        } catch (err) {
            stream.emit(jobStateChange, JobState.FAILED, err);
        } finally {
            this.#active--;
            worker.active--;
        }
    }

    #checkWorker(worker: JobWorker) {
        if (worker.active === 0 && this.#poolSettings.idleTimeout! > 0) {
            worker.timeout = setTimeout(() => {
                if (worker.active === 0) {
                    const idx = this.#pool.indexOf(worker);
                    this.#pool.splice(idx, 1);
                    worker.instance.terminate();
                    return;
                }
                delete worker.timeout;
            }, this.#poolSettings.idleTimeout!);
        }
    }

    // TODO: make it compatible with esmodules.
    #spawnWorker() {
        const w = new Worker(path.resolve(__dirname, './worker.js'));
        w.on('message', (response) => {
            const { uid } = response;
            this.#eventStream.emit(`uid-${uid}`, response);
        });

        const worker = new JobWorker(this.#poolCount++, w);
        this.#pool.push(worker);
        return worker;
    }

    #selectWorker() {
        const inactive = this.#pool.find(x => x.active === 0);
        if (inactive) {
            if (inactive.timeout)
                clearTimeout(inactive.timeout);

            return inactive;
        }

        if (this.#pool.length < this.#poolSettings.maxWorkers!) {
            return this.#spawnWorker();
        }

        const worker = this.#pool.sort((a, b) => (a.active - b.active))[0];
        return (this.#poolSettings.useMainThread && worker.active > this.#mainThreadActive) ? null : worker;
    }
}
