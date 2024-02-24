const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    mock: "..\\test\\mocks\\client-lambda.js",
    result: {
        statusCode: 200,
        body: [{
                "id": 1,
                "name": "Peseta",
                "numSeries": 5,
                "numDenominations": 13,
                "numNotes": 22,
                "numVariants": 221,
            },
            {
                "id": 2,
                "name": "Euro",
                "numSeries": 1,
                "numDenominations": 113,
                "numNotes": 212,
                "numVariants": 221,
            },
            {
                "id": 3,
                "name": "Dollar",
                "numSeries": 5,
                "numDenominations": 13,
                "numNotes": 22,
                "numVariants": 221,
            }
        ]
    },
    event: { "correlationId": 123, "key": "KEY", "domainName": "host" },
    context: {}
}];

let passedCounter = 0;

import (`../src/${TESTED_JS}`)
.then((mod) => {
        console.log(`TESTING ${TESTED_JS}`);

        for (const test of tests) {
            console.log(`Executing ${test.name}...`);
            process.env.CLIENT_LAMBDA_MOCK = test.mock
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