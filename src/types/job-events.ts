import { jobStateChange } from '../constants';
import { JobState } from '../job-state';

export type JobEvents = {
    [jobStateChange]: (state: JobState, data?: any) => void;
    'complete': (err?: any, data?: any) => void;
    'error': (err: any) => void;
};
