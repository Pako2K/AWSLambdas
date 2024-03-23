const TESTED_JS = 'main.js'

const tests = [{
        name: 'test-401',
        result: {
            statusCode: 401,
            body: "{}"
        },
        event: { "headers": { "Authorization": "Basic dXNlcjpwd2Q" }, "correlationId": 123, "key": "KEY", "domainName": "host" },
        context: {}
    },
    {
        name: 'test-success',
        result: {
            statusCode: 200,
            body: { "id": "sessionid", "isAdmin": false, "expiration": 1800000 }
        },
        event: { "headers": { "Authorization": "Basic dXNlcjpwd2Q" }, "correlationId": 123, "key": "KEY", "domainName": "host" },
        context: {}
    }
];

let passedCounter = 0;

import (`../src/${TESTED_JS}`)
.then((mod) => {
        console.log(`TESTING ${TESTED_JS}`);

        for (const test of tests) {
            console.log(`Executing ${test.name}...`);
            mod.handler(test.event)
                .then((result) => {
                    const resultStr = JSON.stringify(result);
                    const expectedStr = JSON.stringify(test.result);

                    if (resultStr === expectedStr) {
                        console.log(`${test.name} => Successful !`);
                        passedCounter++;
                    } else
                        console.log(`${test.name} => FAILED !!!.\n   Result: ${resultStr}\n   Expected: ${expectedStr}`);

                    if (test.name === tests[tests.length - 1].name) logSummary();
                })
                .catch((reason) => {
                    console.log(`${test.name} Exception !!.\n ${reason}`);
                    if (test.name === tests[tests.length - 1].name) logSummary();
                });
        }
    })
    .catch((err) => { console.error(err) });

function logSummary() {
    console.log('******************************************************************');
    console.log(`EXECUTED ${tests.length} TEST CASES. PASSED: ${passedCounter} - FAILED: ${tests.length-passedCounter}`);
    console.log('******************************************************************');
}