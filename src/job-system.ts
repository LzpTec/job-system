import { EventEmitter, once } from 'events';
import os from 'os';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { SerializableValue, Transferable } from './types-utility';

export interface JobSystemSetting {
    maxWorkers?: number;
    minWorkers?: number;
    idleTimeout?: number;
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

const cpuSize = os.cpus().length;

export class JobSystem {
    #eventStream = new EventEmitter();
    #pool: JobWorker[] = [];
    #poolSettings: JobSystemSetting = {
        maxWorkers: Math.max(1, cpuSize >= 6 ? (cpuSize / 2) : cpuSize - 1),
        minWorkers: 0,
        idleTimeout: 0
    };
    #poolCount: number = 0;
    #active: number = 0;
    #isShutdown: boolean = false;

    /**
    * @param settings Job System Settings.
    */
    constructor(settings?: JobSystemSetting) {
        Object.assign(this.#poolSettings, settings);

        if (typeof this.#poolSettings.maxWorkers !== "number" || typeof this.#poolSettings.minWorkers !== "number")
            throw new Error('minWorkers and maxWorkers must be numbers!');

        if (typeof this.#poolSettings.idleTimeout !== "number")
            throw new Error('idleTimeout must be a number!');

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

    public async schedule<T = any, D extends SerializableValue = any>(
        job: (data?: D) => T | Promise<T>,
        data?: D,
        transferList?: Transferable[]
    ) {
        if (this.#isShutdown)
            throw new Error("This Job System is shutdown!");

        const execString = `async () => await (${job.toString()})(${JSON.stringify(data)});`;

        const worker = this.#selectWorker();
        const uid = worker.getUid();
        worker.active++;
        this.#active++;

        worker.instance.postMessage({
            uid: uid,
            handler: execString
        }, transferList);

        return once(this.#eventStream, `uid-${uid}`)
            .then(([res]) => {
                worker.active--;
                this.#active--;

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

                if (this.#active === 0) {
                    this.#eventStream.emit('empty');
                }

                if (res.error)
                    throw res.error;

                return res.data as T;
            });
    }

    /**
     * Wait for all jobs to complete.
     */
    public async complete() {
        if (this.#active === 0)
            return;

        return once(this.#eventStream, 'empty');
    }

    /**
     * Shutdown the Job System.
     */
    public async shutdown(waitForComplete?: boolean) {
        const isShutdown = this.#isShutdown;
        this.#isShutdown = true;

        if (waitForComplete)
            await this.complete();

        if (isShutdown)
            return;

        await Promise.all(this.#pool.map(async ({ instance }) => {
            return instance.terminate();
        })).then(() => { });
    };

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

        if (!inactive && this.#pool.length < this.#poolSettings.maxWorkers!) {
            return this.#spawnWorker();
        }

        return this.#pool.sort((a, b) => (a.active - b.active))[0];
    }
}
