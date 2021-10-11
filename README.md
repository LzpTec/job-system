# @lzptec/job-system
A library to implement a Job System in nodejs using worker_threads.

## Installation

npm
```sh
npm i @lzptec/job-system
```

pnpm
```sh
pnpm i @lzptec/job-system
```

## Usage

### Basic
```ts
import { JobSystem } from '@lzptec/job-system';

const jobSystem = new JobSystem();
const job = ({ a, b }) => a * b;

const result = await jobSystem.schedule(job, { a: 2, b: 5 });
console.log(result); 
// 10

// If you dont need it anymore.
jobSystem.shutdown();

```

## API

### JobSystem(settings?)

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

### schedule(job, data?)

Add a job to the execution queue

#### job
**Required**<br>
Type: `Function`<br>

The function(Job) that must be executed in one of the threads.

#### data
**Optional**<br>
Type: `any`<br>
Default: `undefined`

The data that will be sent to the Job.

### shutdown(waitForComplete?)

Shutdown the Job System.

> **Important:** If the `schedule` method is called after `shutdown`, an error will occur!

#### waitForComplete
**Optional**<br>
Type: `boolean`<br>

Wait all jobs to complete before shutdown.

## Notes
Documentation will be updated over time.