const test = require('ava');
const JobSystem = require(__dirname + '/../dist/index.js').JobSystem;

test('schedule', async t => {
    const jobSystem = new JobSystem();
    const job = ({ a, b }) => a * b;

    await jobSystem.schedule(job, { a: 3, b: 20 })
        .then(result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });

    jobSystem.shutdown();
});

test('shutdown(wait)', async t => {
    const jobSystem = new JobSystem();
    const job = ({ a, b }) => a * b;

    jobSystem.schedule(job, { a: 3, b: 20 })
        .then(result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });

    await jobSystem.shutdown(true);
});

test('error', async t => {
    const jobSystem = new JobSystem();
    const job = () => { throw new Error("Fail"); };

    await jobSystem.schedule(job)
        .then(() => {
            t.fail('Catch should be called instead!');
        }).catch(err => {
            t.is(err.message, `Fail`);
            t.pass();
        });

    jobSystem.shutdown();
});