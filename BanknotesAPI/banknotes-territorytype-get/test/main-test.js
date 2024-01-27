const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    result: {
        statusCode: 200,
        body: [{
                "id": 3,
                "name": "Independent State",
                "abbrevation": "Ind",
                "description": "Independent state recognized by UN"
            },
            {
                "id": 2,
                "name": "Economic Union",
                "abbrevation": "EU",
                "description": "Political and/or economical union of independent states"
            },
            {
                "id": 4,
                "name": "Not Recognized State",
                "abbrevation": "NR",
                "description": "Independent state not recognized by all the countries in UN"
            },
            {
                "id": 5,
                "name": "Territory",
                "abbrevation": "T",
                "description": "Non idependent territory with a political and economic relation to an independent state"
            }
        ]
    },
    event: { "correlationId": 123, "key": "KEY" },
    context: {}
}];

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