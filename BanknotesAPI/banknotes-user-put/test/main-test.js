const TESTED_JS = 'main.js'

const tests = [{
        name: 'test-invalid_pwd',
        result: {
            statusCode: 400,
            body: '{"code":"REG-05","description":"Password is too short (less than 8 characters) or too long (more than 32 characters)"}'
        },
        event: { "headers": { "Authorization": "Basic dXNlcjpwd2Q" }, "correlationId": 123, "key": "KEY", "domainName": "host", "body": { "email": "fdelanuza@gmail.com" } },
        context: {}
    },
    {
        name: 'test-success',
        result: {
            statusCode: 200,
            body: { "id": "sessionid", "isAdmin": false, "expiration": 300000 }
        },
        event: { "headers": { "Authorization": "Basic dXNlcjpwd2QxMjM0NQ" }, "correlationId": 123, "key": "KEY", "domainName": "host", "body": { "email": "fdelanuza@gmail.com" } },
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