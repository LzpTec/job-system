import { JobState } from './job-state';

export const jobStateChange = Symbol('jobStateChange');
export type JobEvents = { [jobStateChange]: (state: JobState, data?: any) => void };