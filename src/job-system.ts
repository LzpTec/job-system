import { EventEmitter, once } from 'events';
import os from 'os';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { NoExtraProperties } from '.';
import { Job } from './job';
import { SerializableValue, Transferable } from './types-utility';

export interface JobSystemSetting {
    maxWorkers?: number;
    minWorkers?: number;
    idleTimeout?: number;
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
        return `${this.#id}-${this.#jobCount.toString(16)}`;
    }
}

class JobHandle<T> {
    readonly #job: Promise<T>;
    #isCompleted: boolean = false;

    constructor(job: Promise<T>) {
        this.#job = job
            .finally(() => {
                this.#isCompleted = true;
            });
    }

    public async complete() {
        return this.#job;
    }

    public get isCompleted() {
        return this.#isCompleted;
    }

}

const cpuSize = os.cpus().length;

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
     * @param job The job to run.
     * 
     * @returns Job result
     */
    schedule<T = any>(
        job: () => T | Promise<T>
    ): Promise<T>;

    /**
     * @param job The job to run.
     * 
     * @returns Job result
     */
    schedule<T = any>(
        job: NoExtraProperties<Job<T>>
    ): JobHandle<T>;

    /**
     * @param job The job to run.
     * @param dependencies A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.
     * 
     * @returns Job result
     */
    schedule<T = any>(
        job: NoExtraProperties<Job<T>>,
        dependencies: JobHandle<any>[]
    ): JobHandle<T>;

    /**
     * @param job The job to run.
     * @param data data to worker(Needs to be serializable).
     * 
     * @returns Job result
     */
    schedule<T = any, D extends SerializableValue = any>(
        job: (data: D) => T | Promise<T>,
        data: D
    ): Promise<T>;

    /**
     * @param job The job to run.
     * @param data data to worker(Needs to be serializable).
     * @param transferList list of transferable objects like ArrayBuffers to be transferred to the receiving worker thread.
     * 
     * @returns Job result
     */
    schedule<T = any, D extends SerializableValue = any>(
        job: (data: D) => T | Promise<T>,
        data: D,
        transferList: Transferable[]
    ): Promise<T>;

    public schedule<T = any, D extends SerializableValue = any>(
        job: ((data?: D) => T | Promise<T>) | NoExtraProperties<Job<T>>,
        data?: D | JobHandle<any>[],
        transferList?: Transferable[]
    ) {
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
        const result = dependency
            .then<T>(async () => {
                const worker = this.#selectWorker();

                return (!worker)
                    ? this.#runOnMainThread(job, data as D)
                        .finally(() => this.#checkCompletion())
                    : this.#runOnWorker(worker, job, data, transferList)
                        .finally(() => this.#checkCompletion());
            });


        return isUsingJob ? new JobHandle<T>(result) : result;
    }

    async #checkCompletion() {
        if (this.#active === 0)
            this.#eventStream.emit('empty');
    }

    /**
     * Wait for all jobs to complete.
     */
    public async complete(): Promise<void> {
        if (this.#active > 0)
            await once(this.#eventStream, 'empty');

        return;
    }

    /**
     * Shutdown the Job System.
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
        job: ((data?: D) => T | Promise<T>) | NoExtraProperties<Job<T>>,
        data?: D
    ) {
        this.#active++;
        this.#mainThreadActive++;
        try {
            const response = await ((job instanceof Job) ? job.execute() : job(data));
            return response as T;
        } catch (err) {
            throw err;
        } finally {
            this.#active--;
            this.#mainThreadActive--;
        }
    }

    async #runOnWorker<T = any, D = any>(
        worker: JobWorker,
        job: ((data?: D) => T | Promise<T>) | NoExtraProperties<Job<T>>,
        data?: D | JobHandle<any>[],
        transferList?: Transferable[]
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

            const [res] = await once(this.#eventStream, `uid-${uid}`);

            if (res.error)
                throw res.error;

            return res.response as T;
        } catch (err) {
            throw err;
        } finally {
            this.#active--;
            worker.active--;
            this.#checkWorker(worker);
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