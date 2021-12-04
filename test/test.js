const test = require('ava');
const JobSystem = require(__dirname + '/../dist/index.js').JobSystem;

test('schedule(data only)', async t => {
    const job = ({ a, b }) => a * b;

    await JobSystem
        .schedule(job, { a: 3, b: 20 })
        .complete()
        .then(result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });
});

test('error', async t => {
    const job = () => { throw new Error("Fail"); };

    await JobSystem
        .schedule(job)
        .complete()
        .then(() => {
            t.fail('Catch should be called instead!');
        }).catch(err => {
            t.is(err.message, `Fail`);
            t.pass();
            return;
        });
});

test('shutdown(wait)', async t => {
    const jobSchedule = JobSystem
        .schedule(({ a, b }) => a * b, { a: 3, b: 20 });

    await jobSchedule
        .complete()
        .then(async result => {
            t.deepEqual(result, 60);
            t.pass();
        }).catch(err => {
            t.fail(err);
        });
});