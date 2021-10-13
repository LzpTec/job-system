import { parentPort } from 'worker_threads';

function worker() {
    if (!parentPort)
        return process.exit(-1);

    parentPort?.on('message', async msg => {
        const { handler, uid, data } = msg;

        try {
            const response = await eval(handler)(data);

            parentPort?.postMessage({
                uid,
                response
            });
        } catch (err: any) {
            parentPort?.postMessage({
                uid,
                error: {
                    message: err.message,
                    stack: err.stack,
                }
            });
        }

    });
}

worker();
