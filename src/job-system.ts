import { JobHandle } from './job-handle';
import { ThreadPool } from './thread-pool';
import { SerializableValue } from './types/serializable-value';
import { Transferable } from './types/transferable';

export class JobSystem {
    static #pool: ThreadPool = new ThreadPool();

    /**
     * Schedule a job to run.
     * 
     * @param job The job to run.
     * 
     * @returns Job Handle.
     */
    static schedule<T = any>(
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
    static schedule<T = any, D extends SerializableValue = any>(
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
    static schedule<T = any, D extends SerializableValue = any>(
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
    static schedule<T = any, D extends SerializableValue = any, U extends SerializableValue[] = any[]>(
        job: (data: D) => T | Promise<T>,
        data: D,
        dependencies: JobHandle<any>[],
        transferList: Transferable[]
    ): JobHandle<T>;

    public static schedule<T = any, D extends SerializableValue = any>(
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
            .then(() => this.#pool.run(jobHandle, job, data, transferList));

        return jobHandle;
    }

}