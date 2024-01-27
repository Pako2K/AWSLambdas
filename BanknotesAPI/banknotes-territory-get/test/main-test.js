const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    result: {
        statusCode: 200,
        body: [{
                "id": 1,
                "name": "Afghanistan",
                "continentId": 5,
                "territoryTypeId": 3,
                "start": 1919,
                "uri": "https://host/territory/1"
            },
            {
                "id": 2,
                "iso3": "ALB",
                "name": "Albania",
                "continentId": 6,
                "territoryTypeId": 3,
                "start": 1912,
                "uri": "https://host/territory/2"
            },
            {
                "id": 3,
                "iso3": "DZA",
                "name": "Algeria",
                "continentId": 4,
                "territoryTypeId": 3,
                "start": 1962,
                "end": 2099,
                "uri": "https://host/territory/3"
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