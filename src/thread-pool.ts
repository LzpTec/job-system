import { cpus } from 'os';
import * as path from 'path';
import { clearTimeout } from 'timers';
import { Worker } from 'worker_threads';
import { SerializableValue } from '.';
import { JobHandle } from './job-handle';
import { MainThread } from './main-thread';
import { Transferable } from './types/transferable';
import { WorkerThread } from './worker-thread';

/**
 * Job System Settings interface.
 */
export interface ThreadPoolSettings {
    /**
     * Defines the maximum number of workers the Job System can instantiate.
     */
    maxWorkers: number;

    /**
     * Defines the minimum number of workers the Job System will instantiate on startup.
     */
    minWorkers: number;

    /**
     * Defines the maximum idle time of a worker inside the pool, after this time the worker will be terminated.
     * 
     * The timer resets if a new work is schedule to that worker.
     */
    idleTimeout?: number;

    /**
     * Use the main thread if no worker is available.
     */
    useMainThread: boolean;
}

const cpuSize = cpus().length;
export class ThreadPool {
    poolSettings: Readonly<ThreadPoolSettings> = {
        maxWorkers: Math.max(1, cpuSize >= 6 ? (cpuSize / 2) : cpuSize - 1),
        minWorkers: 0,
        idleTimeout: 0,
        useMainThread: false
    };

    #pool: WorkerThread[] = [];
    #poolCount: number = 0;
    #mainThreadCount: number = 0;

    constructor(poolSettings?: Partial<ThreadPoolSettings>) {
        this.poolSettings = Object.assign({}, this.poolSettings, poolSettings);
    }

    #selectWorker() {
        const inactive = this.#pool.find(x => x.active === 0);
        if (inactive) {
            if (inactive.timeout)
                clearTimeout(inactive.timeout);

            return inactive;
        }

        if (this.#pool.length < this.poolSettings.maxWorkers!) {
            return this.#spawnWorker();
        }

        const worker = this.#pool.sort((a, b) => (a.active - b.active))[0];
        if (this.poolSettings.useMainThread && worker.active > this.#mainThreadCount)
            return null;

        return worker;
    }

    #spawnWorker() {
        const w = new Worker(path.resolve(__dirname, './worker.js'));
        const worker = new WorkerThread(this.#poolCount++, w);
        w.on('message', (response) => {
            const { uid } = response;
            worker.emit(`uid-${uid}`, response);
        });


        this.#pool.push(worker);
        return worker;
    }

    checkWorkers() {
        for (let i = this.#pool.length - 1; i >= 0; i--)
            this.#checkWorker(this.#pool[i]);
    }

    #checkWorker(worker: WorkerThread) {
        if (worker.active === 0 && this.#pool.length > this.poolSettings.maxWorkers) {
            const idx = this.#pool.indexOf(worker);
            this.#pool.splice(idx, 1);
            worker.instance.terminate();
        }

        if (worker.active === 0 && this.poolSettings.idleTimeout! > 0) {
            worker.timeout = setTimeout(() => {
                if (worker.active === 0) {
                    const idx = this.#pool.indexOf(worker);
                    this.#pool.splice(idx, 1);
                    worker.instance.terminate();
                    return;
                }

                if (worker.timeout) {
                    clearTimeout(worker.timeout);
                    delete worker.timeout;
                }
            }, this.poolSettings.idleTimeout!);
        }

        if (worker.active > 0 && worker.timeout) {
            clearTimeout(worker.timeout);
            delete worker.timeout;
        }
    }

    public async run<T = any, D = any>(
        jobHandle: JobHandle<T>,
        job: (data?: D) => T | Promise<T>,
        data?: D,
        transferList?: Transferable[]
    ) {
        const worker = this.#selectWorker();
        if (!worker)
            return MainThread.run(jobHandle, job, data);

        worker.active++;

        return worker
            .run(jobHandle, job, data, transferList)
            .finally(() => {
                worker.active--;
                this.#checkWorker(worker);
            });
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
     * @param dependencies A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.
     * 
     * @returns Job Handle.
     */
    schedule<T = any, D extends SerializableValue = any>(
        job: (data: D) => T | Promise<T>,
        data: D,
        dependencies: JobHandle<any>[]
    ): JobHandle<T>;

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * @param data data to worker(Needs to be serializable).
     * @param dependencies A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.
     * @param transferList list of transferable objects like ArrayBuffers to be transferred to the receiving worker thread.
     * 
     * @returns Job Handle.
     */
    schedule<T = any, D extends SerializableValue = any, U extends SerializableValue[] = any[]>(
        job: (data: D) => T | Promise<T>,
        data: D,
        dependencies: JobHandle<any>[],
        transferList: Transferable[]
    ): JobHandle<T>;

    public schedule<T = any, D extends SerializableValue = any>(
        job: (data?: D) => T | Promise<T>,
        data?: D,
        dependencies?: JobHandle<any>[],
        transferList?: Transferable[]
    ): JobHandle<T> {
        if (typeof job !== "function")
            throw new Error("Job parameter must be a function.");

        const promises = Array.isArray(dependencies) ? dependencies.map(async x => {
            if (x instanceof JobHandle)
                return x.complete();

            return;
        }) : undefined;

        const dependency = (promises ? Promise.all(promises) : Promise.resolve());

        const jobHandle = new JobHandle<T>();

        dependency
            .then(() => this.run(jobHandle, job, data, transferList));

        return jobHandle;
    }

}