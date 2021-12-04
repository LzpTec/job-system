import { cpus } from 'os';
import * as path from 'path';
import { clearTimeout } from 'timers';
import { Worker } from 'worker_threads';
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
}