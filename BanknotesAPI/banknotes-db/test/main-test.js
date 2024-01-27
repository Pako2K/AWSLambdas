const TESTED_JS = 'main.mjs'


const tests = [{
        name: 'test-query',
        result: {
            statusCode: 200,
            body: [{ "name": "Antarctica" }, { "name": "North America" }, { "name": "South America" }, { "name": "Africa" }, { "name": "Asia" }, { "name": "Europe" }, { "name": "Oceania" }]
        },
        event: { sql: "SELECT con_name as name from con_continent" },
        context: {}
    },
    {
        name: 'test-query-failed',
        result: {
            statusCode: 500,
            body: { "exception": { "code": 5003, "message": "relation \"dummy\" does not exist" } }
        },
        event: { sql: "SELECT con_name as name from dummy" },
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

                if (test.name === tests[tests.length - 1].name)
                    logSummary();
            })
            .catch((reason) => {
                console.log(`${test.name} Exception !!.\n ${reason}`);
                if (test.name === tests[tests.length - 1].name) logSummary();
            });
    }

}).catch((err) => { console.error(err) });



function logSummary() {
    console.log('******************************************************************');
    console.log(`EXECUTED ${tests.length} TEST CASES. PASSED: ${passedCounter} - FAILED: ${tests.length-passedCounter}`);
    console.log('******************************************************************');
    process.exit();
}