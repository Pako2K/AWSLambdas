const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    result: {
        statusCode: 200,
        body: [
            { "denomination": 0.005, "continentStats": [{ "id": 3, "isCurrent": false, "numTerritories": 1, "numCurrencies": 1, "numNotes": 1, "numVariants": 1 }], "totalStats": { "isCurrent": false, "numTerritories": 1, "numCurrencies": 1, "numNotes": 1, "numVariants": 1 } },
            {
                "denomination": 0.01,
                "continentStats": [
                    { "id": 2, "isCurrent": false, "numTerritories": 1, "numCurrencies": 1, "numNotes": 1, "numVariants": 1 },
                    { "id": 3, "isCurrent": false, "numTerritories": 3, "numCurrencies": 3, "numNotes": 3, "numVariants": 4 },
                    { "id": 4, "isCurrent": true, "numTerritories": 3, "numCurrencies": 3, "numNotes": 3, "numVariants": 3 },
                    { "id": 5, "isCurrent": false, "numTerritories": 7, "numCurrencies": 8, "numNotes": 10, "numVariants": 20 },
                    { "id": 6, "isCurrent": false, "numTerritories": 1, "numCurrencies": 1, "numNotes": 1, "numVariants": 1 }
                ],
                "totalStats": { "isCurrent": true, "numTerritories": 15, "numCurrencies": 16, "numNotes": 18, "numVariants": 29 }
            },
            { "denomination": 0.0167, "continentStats": [{ "id": 6, "isCurrent": true, "numTerritories": 2, "numCurrencies": 1, "numNotes": 2, "numVariants": 6 }], "totalStats": { "isCurrent": true, "numTerritories": 2, "numCurrencies": 1, "numNotes": 2, "numVariants": 6 } },
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