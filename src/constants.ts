import { JobState } from './job-state';

export const jobStateChange = Symbol('jobStateChange');

export type JobEvents = {
    [jobStateChange]: (state: JobState, data?: any) => void;
    'complete': (err?: any, data?: any) => void;
    'error': (err: any) => void;
};
