import { parentPort } from 'worker_threads';

function worker() {
    if (!parentPort)
        return process.exit(-1);

    parentPort?.on('message', async msg => {
        const { handler, uid } = msg;

        try {
            const data = await eval(handler)();

            parentPort?.postMessage({
                uid,
                data
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
