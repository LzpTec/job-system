# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.5.0-0](https://github.com/LzpTec/job-system/compare/v0.4.0...v0.5.0-0) (2022-03-05)


### ⚠ BREAKING CHANGES

* Removed JobSystem class, use ThreadPool instead.
* Complete Overhaul of the JobSystem.
* Remove Job class.

### Features

* Complete Overhaul of the JobSystem. ([cf23bb3](https://github.com/LzpTec/job-system/commit/cf23bb363bbc79896630e4497e8847805f1c7929))
* Remove Job class. ([f507430](https://github.com/LzpTec/job-system/commit/f507430bc88cd467a5b6be73efb4e74a96d7833a))
* Removed JobSystem class, use ThreadPool instead. ([472e2c8](https://github.com/LzpTec/job-system/commit/472e2c8d4f68419c39135d6f231ef38e52489365))


### Refactor

* Improved ThreadPool internal logic. ([095d452](https://github.com/LzpTec/job-system/commit/095d452a4d6e232a102b42ffdb15ad09eafedd30))


### Docs

* Add info about 1.0.0 ([0b9a6d1](https://github.com/LzpTec/job-system/commit/0b9a6d1a83bcde2e6e075c302589c07e453ea8e0))
* Add TODO list. ([53fef73](https://github.com/LzpTec/job-system/commit/53fef73c628c38c919f367fd382c0962414d8b33))
* Improved 1.0.0 info. ([e279733](https://github.com/LzpTec/job-system/commit/e2797333494919caafa6a72a0c4116c10e25204b))
* Improved readme. ([f45c9ed](https://github.com/LzpTec/job-system/commit/f45c9ed62ebf39522e30eeb0849b832bdf5bf562))
* Removed this from advanced example. ([a52a2ab](https://github.com/LzpTec/job-system/commit/a52a2ab1d1056d5f4a134cc35d18ecde42a50d7f))
* Update TODO list. ([7e38f5f](https://github.com/LzpTec/job-system/commit/7e38f5fa6819206728e157a44370061cd32f992a))

## [0.4.0](https://github.com/LzpTec/job-system/compare/v0.3.0...v0.4.0) (2021-11-15)


### ⚠ BREAKING CHANGES

* Removed isCompleted from JobHandle.

### Features

* Add `success` and `error` events to JobHandle. ([0da010b](https://github.com/LzpTec/job-system/commit/0da010bb82cf503e3aa026b1afbcf6c3ff47dcbb))
* Removed isCompleted from JobHandle. ([849df09](https://github.com/LzpTec/job-system/commit/849df094d7a6f596290827161ae7b9f9841e670d))


### Bug Fixes

* fix job handle complete method. ([e6d019b](https://github.com/LzpTec/job-system/commit/e6d019b98d305972cd7bbd3b3e5e04e390bfbcc6))


### Refactor

* Change worker function to const. ([3037325](https://github.com/LzpTec/job-system/commit/3037325c991c118f60166b2ded87f3825c5db6b7))
* Improve project structure. ([d280472](https://github.com/LzpTec/job-system/commit/d28047253332894c83a11c8e5b73fdd3e18d07d0))


### Docs

* Update JobHandle readme. ([39f94c9](https://github.com/LzpTec/job-system/commit/39f94c91e25bcf00787950c66efff0fba2c2a56e))

## [0.3.0](https://github.com/LzpTec/job-system/compare/v0.2.0...v0.3.0) (2021-10-24)


### ⚠ BREAKING CHANGES

* Removed unused deferred<T>.

### Features

* Improved SerializableValue type. ([d856001](https://github.com/LzpTec/job-system/commit/d8560016df2fe25b3ba315b248722a7946738d22))
* Job Handle now extends EventEmitter. ([126a59e](https://github.com/LzpTec/job-system/commit/126a59eb407d609575713c5875c8d69af79a6789))
* **package:** rename ts-types to build:ts ([05b7fce](https://github.com/LzpTec/job-system/commit/05b7fce206c39ec15190a7df30aa85e415fa4cb3))
* Removed unused deferred<T>. ([6d99587](https://github.com/LzpTec/job-system/commit/6d995877548cd6b6cde5af3f3d02782bb093749c))

## [0.2.0](https://github.com/LzpTec/job-system/compare/v0.1.0...v0.2.0) (2021-10-18)


### Features

* Implemented Job State. ([e717eb8](https://github.com/LzpTec/job-system/commit/e717eb828af3456285e44d3af3b2e696226fbdf4))
* Increase radix from 16 to 36. ([738d5a1](https://github.com/LzpTec/job-system/commit/738d5a13576427e90463a32a67cc55345b6d3019))


### Bug Fixes

* **build:** fix build settings. ([a7f6791](https://github.com/LzpTec/job-system/commit/a7f6791f3146bc70f1e6e483b70a89c7a80f6ff1))


### Refactor

* Change build output format. ([897d561](https://github.com/LzpTec/job-system/commit/897d561e923d4efe55b29b0be1bf2f0288e68405))
* Move Deferred<T> to utils folder. ([17c0d05](https://github.com/LzpTec/job-system/commit/17c0d050b2a0130a00c26695c8d2d6f6d2db4a41))
* Move JobHandle to job-handle.ts. ([2c3ab92](https://github.com/LzpTec/job-system/commit/2c3ab927d4db52c663972df953815cba0c92925d))
* Move jobStateChange Symbol to constants.ts. ([960c4fa](https://github.com/LzpTec/job-system/commit/960c4fa7130b927875c0632a452ddefa73d32c3a))
* Move types-utility to utils folder. ([d954c8f](https://github.com/LzpTec/job-system/commit/d954c8f8fa2ea43f34268caf7e9ca32e7eb3bcd7))

## [0.1.0](https://github.com/LzpTec/job-system/compare/v0.0.4...v0.1.0) (2021-10-14)


### ⚠ BREAKING CHANGES

* All schedule methods now returns a JobHandle<T> instead of a Promise<T>.

### Features

* all schedule methods now returns a JobHandle. ([1dc5085](https://github.com/LzpTec/job-system/commit/1dc5085e3c64ef3b42d8c19b0d48adafde9e4fbd))
* Improve SerializableValue and Transferable types. ([c9dfa62](https://github.com/LzpTec/job-system/commit/c9dfa62cd00e136da6b04bf23ffb94dd0efa3483))
* removed NoExtraProperties utility type. ([354624e](https://github.com/LzpTec/job-system/commit/354624e7bda8f593d9cd17cdc0abb07f486d573c))


### Bug Fixes

* commitUrlFormat. ([734b395](https://github.com/LzpTec/job-system/commit/734b3952a78b4e0f2b6c3ecf684d8bd89ce7668d))


### Refactor

* Improve `schedule` function. ([a43c989](https://github.com/LzpTec/job-system/commit/a43c9895a04299863174a1c23420e9a6cf0cb89c))


### Docs

* all schedule methods now returns a JobHandle. ([c3da075](https://github.com/LzpTec/job-system/commit/c3da075faf80bcc4edfc702de63933727c2ef930))
* Improve in code docs. ([b62c068](https://github.com/LzpTec/job-system/commit/b62c068d1b71ce5dd1daa20b4508dbacc3e62ebf))
* Improve in code JobHandle docs. ([01ef06a](https://github.com/LzpTec/job-system/commit/01ef06aff5a012159bdf38fe2b3e79596f3aba6a))
* Removed todo.txt ([c6bbde0](https://github.com/LzpTec/job-system/commit/c6bbde0c43e20bebbb280b74663f8ecd772d1922))

### 0.0.4 (2021-10-13)

### Features

* Implement data transfer. ([e6ea77f](https://github.com/LzpTec/job-system/commits/e6ea77fc347a78f1c9ea71c9514e983be3e7e0ff))

### Refactor

* Improve `schedule` function. ([a43c989](https://github.com/LzpTec/job-system/commits/a43c9895a04299863174a1c23420e9a6cf0cb89c))