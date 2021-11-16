const test = require('ava');
const JobSystem = require(__dirname + '/../dist/index.js').JobSystem;

test('schedule(data only)', async t => {
    const jobSystem = new JobSystem();
    const job = ({ a, b }) => a * b;

    await jobSystem
        .schedule(job, { a: 3, b: 20 })
        .complete()
        .then(result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });

    jobSystem.shutdown();
});

test('error', async t => {
    const jobSystem = new JobSystem();
    const job = () => { throw new Error("Fail"); };

    await jobSystem
        .schedule(job)
        .complete()
        .then(() => {
            t.fail('Catch should be called instead!');
        }).catch(err => {
            t.is(err.message, `Fail`);
            t.pass();
        });

    jobSystem.shutdown();
});

test('shutdown(wait)', async t => {
    const jobSystem = new JobSystem();
    const jobSchedule = jobSystem
        .schedule(({ a, b }) => a * b, { a: 3, b: 20 });

    jobSchedule
        .complete()
        .then(async result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });

    await jobSystem.shutdown(true);
});