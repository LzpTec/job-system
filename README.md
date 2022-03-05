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

⚠ Version 1.0.0 will be the first **Stable** Release and the Usage will change drastically.

## Basic
```ts
import { ThreadPool } from '@lzptec/job-system';

const threadPool = new ThreadPool();

const job = ({ a, b }) => a * b;

// When we schedule a Job the return will be a JobHandle<T>.
const jobHandle = await threadPool.schedule(job, { a: 2, b: 5 });
// OR
const jobHandle = await threadPool.schedule(({ a, b }) => a * b, { a: 2, b: 5 });

// If we want to get the result, we need to call complete()
const result = await jobHandle.complete();
console.log(result); // 10
```

## Advanced
```ts
import { ThreadPool } from '@lzptec/job-system';

const threadPool = new ThreadPool();

// When we schedule a Job the return will be a JobHandle<T>.
const jobHandle = threadPool.schedule(({ a, b }) => a * b, { a: 2, b: 5 });

// If we want to get the result, we need to call complete()
const result = await jobHandle.complete();
console.log(result); // 10

// We can use the JobHandle<T> as Dependency to another job, this will ensure that a job run only after the dependency job.
const job1Handle = threadPool.schedule((data) => console.log(`Hello from Job n${data}`), 1);
const job2Handle = threadPool.schedule((data) => console.log(`Hello from Job n${data}`), 2, [job1Handle]);

await job2Handle.complete();
// Console
// -> Hello from Job n1
// -> Hello from Job n2
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

### schedule(job, data?, dependencies?, transferList?)
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

#### dependencies
**Optional**<br>
Type: `JobHandle[] | undefined`<br>
Default: `undefined`

A list of depedencies, use it to ensure that a job executes after all the dependencies has completed execution.

#### transferList
**Optional**<br>
Type: `Transferable[] | undefined`<br>
Default: `undefined`

A list of transferable objects like ArrayBuffers to be transferred to the receiving worker thread.

### complete()

Wait all jobs in the queue to complete.

### shutdown(waitForComplete?)

Shutdown the Job System.

> **Important:** If the `schedule` method is called after `shutdown`, an error will occur!

#### waitForComplete
**Optional**<br>
Type: `boolean`<br>

Wait all jobs to complete before shutdown.

## JobHandle<T> extends EventEmitter

JobHandle.

### JobHandle.complete()

Returns a Promise that resolves when the job completes.

### JobHandle.state

Returns the current job state.

### Events
`success | error | complete`

# Notes

Documentation will be updated over time.