# @lzptec/job-system
A library to implement a Job System in nodejs using worker_threads.

# Installation

npm
```sh
npm i @lzptec/job-system
```

pnpm
```sh
pnpm i @lzptec/job-system
```

# Usage
The following examples uses typescript

## Basic
```ts
import { JobSystem } from '@lzptec/job-system';

const jobSystem = new JobSystem();
const job = ({ a, b }) => a * b;

// When we schedule a Job the return will be a JobHandle<T>.
const jobHandle = await jobSystem.schedule(job, { a: 2, b: 5 });
// OR
// const jobHandle = await jobSystem.schedule(({ a, b }) => a * b, { a: 2, b: 5 });

// If we want to get the result, we need to call complete()
const result = await jobHandle.complete();
console.log(result); // 10

// If you dont need the job system anymore.
jobSystem.shutdown();

```

## Advanced
```ts
import { JobSystem, Job } from '@lzptec/job-system';

const jobSystem = new JobSystem();

// Here we create a class specific for this job.
class MultiplicationJob extends Job<number>{
    // This is optional, only use this to have access to types on execute() / .data
    override data!: { a: number, b: number };

    // The constructor is optional, more on that bellow
    constructor(data: { a: number, b: number }) {
        super();
        this.data = data;
    }

    // This method will be called on the worker thread.
    override execute() {
        return this.data.a * this.data.b;
    }
}

const job = new MultiplicationJob({ a: 2, b: 5 });

// When we schedule a Job the return will be a JobHandle<T>.
const jobHandle = jobSystem.schedule(job);

// If we want to get the result, we need to call complete()
const result = await jobHandle.complete();
console.log(result); // 10

// Here we create a class specific for this job.
class LogJob extends Job<void>{
    // This is optional, only use this to have access to types on execute() / .data
    override data!: number;

    override execute() {
        console.log(`Hello from Job n${this.data}`);
    }
}

// We can use the JobHandle<T> as Dependency to another job, this will ensure that a job run only after the dependency job.
const job1 = new LogJob();
job1.data = 1;
const job2 = new LogJob();
job2.data = 2;

const job1Handle = jobSystem.schedule(job1);
const job2Handle = jobSystem.schedule(job2, [job1Handle]);

await job2Handle.complete();
// Console
// -> Hello from Job n1
// -> Hello from Job n2

// If you dont need the job system anymore.
jobSystem.shutdown();

```

# API

## JobSystem(settings?)

Returns a new instance of JobSystem!

#### settings.maxWorkers
**Optional**<br>
Type: `number | undefined`<br>
Default: `undefined`

Defines the maximum number of workers the Job System can instantiate.
If it is `undefined` the number of workers will be automatically defined using the following logic:
```ts
const cpuSize = os.cpus().length;
const maxWorkers = Math.max(1, cpuSize >= 6 ? (cpuSize / 2) : cpuSize - 1);
```

> **Important:** If a number smaller than 1 is set, an error will occur!

#### settings.minWorkers
**Optional**<br>
Type: `number | undefined`<br>
Default: `0`

Defines the minimum number of workers the Job System will instantiate on startup.

> **Important:** If the value is bigger than `maxWorkers` it will use `maxWorkers` instead.

#### settings.idleTimeout
**Optional**<br>
Type: `number | undefined`<br>
Default: `0`

Defines the maximum idle time of a worker inside the pool, after this time the worker will be terminated.
The timer resets if a new work is schedule to that worker.

> **Important:** If the value is set to `0` the Worker stays alive until the shutdown method is called.

#### settings.useMainThread
**Optional**<br>
Type: `boolean | undefined`<br>
Default: `undefined`

Use the main thread if no worker is available.

### schedule(job, data?, transferList?)
Returns: `JobHandle`

Add a job to the execution queue

#### job
**Required**<br>
Type: `Function`<br>

The `function` that must be executed in one of the threads.

#### data
**Optional**<br>
Type: `SerializableValue | undefined`<br>
Default: `undefined`

The data that will be sent to the Job.

#### transferList
**Optional**<br>
Type: `Transferable[] | undefined`<br>
Default: `undefined`

A list of transferable objects like ArrayBuffers to be transferred to the receiving worker thread.

### schedule(job, dependencies?)
Returns: `JobHandle`

Add a job to the execution queue

#### job
**Required**<br>
Type: `Job<T>`<br>

The `Job<T>` that must be executed in one of the threads. Read more on Advanced Usage.

#### dependencies
**Optional**<br>
Type: `JobHandle[] | undefined`<br>
Default: `undefined`

A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.

### complete()

Wait all jobs in the queue to complete.

### shutdown(waitForComplete?)

Shutdown the Job System.

> **Important:** If the `schedule` method is called after `shutdown`, an error will occur!

#### waitForComplete
**Optional**<br>
Type: `boolean`<br>

Wait all jobs to complete before shutdown.

## Job<T>

Implement this abstract class to create your scoped jobs.

### execute()
**Required**<br>
Type: `Function`<br>

The execute `function` will be called from one of the threads.

### data
**Required**<br>
Type: `SerializableValue`

The data that will be used in the Job.

## JobHandle<T>

JobHandle.

### JobHandle.complete()

Returns a Promise that resolves when the job completes.

### JobHandle.state

Returns the current job state.

# Notes

Documentation will be updated over time.