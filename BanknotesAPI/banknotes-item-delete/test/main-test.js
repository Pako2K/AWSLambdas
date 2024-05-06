const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    mock: "..\\test\\mocks\\client-lambda.js",
    result: {
        statusCode: 200,
        body: [{
                "id": 1,
                "iso3": "AFG",
                "name": "Afghanistan",
                "iso2": "AF",
                "officialName": "Afggggg",
                "start": 1919,
                "end": 2034,
                "parentId": 213,
                "successors": [{ "id": 214 }, { "id": 215 }],
                "description": "desc",
                "uri": "https://host/territory?id=1",
                "continent": { "id": 5, "name": "Asia" },
                "territoryType": { "id": 3, "name": "Independent State" }
            },
            {
                "id": 2,
                "iso3": "ALB",
                "name": "Albania",
                "officialName": "Afggggg",
                "start": 1912,
                "successors": [{ "id": 214 }],
                "uri": "https://host/territory?id=2",
                "continent": { "id": 6, "name": "Europa" },
                "territoryType": { "id": 3, "name": "Independent State" }
            },
            {
                "id": 3,
                "iso3": "DZA",
                "name": "Algeria",
                "officialName": "Afggggg",
                "start": 1912,
                "uri": "https://host/territory?id=3",
                "continent": { "id": 2, "name": "Africa" },
                "territoryType": { "id": 1, "name": "Territory" }
            }
        ]
    },
    event: {
        "queryStrParams": { "user": "someUSer" },
        "correlationId": 123,
        "key": "KEY",
        "domainName": "host",
        "body": {
            "id": 0,
            "variantId": 1,
            "grade": "XF",
            "quantity": 1,
            "price": 5,
            "purchaseDate": "2002-03-01",
            "description": "Prefix 'V'. Printer Code 'M'"
        }
    },
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