const TESTED_JS = 'logger.js'

const { Logger } = await
import (`../lib/${TESTED_JS}`);


const tests = [{
        name: 'test-logger DEBUG',
        appName: "TESTER",
        corrId: "CORR-1",
        key: "KEY-1",
        level: "DEBUG"
    },
    {
        name: 'test-logger INFO',
        appName: "TESTER",
        corrId: "CORR-2",
        key: "KEY-2",
        level: "INFO"
    },
    {
        name: 'test-logger WARN',
        appName: "TESTER",
        corrId: "CORR-3",
        key: "KEY-3",
        level: "WARN"
    },
    {
        name: 'test-logger ERROR',
        appName: "TESTER",
        corrId: "CORR-11",
        key: "KEY-11",
        level: "ERROR"
    },
    {
        name: 'test-logger No Level',
        appName: "TESTER",
        corrId: "CORR-12",
        key: "KEY-12",
        level: ""
    },
    {
        name: 'test-logger No Context',
        level: "DEBUG"
    }
];

let passedCounter = 0;


console.log(`TESTING ${TESTED_JS}`);

for (const test of tests) {
    console.log(`Executing ${test.name}...`);
    process.env.LOG_LEVEL = test.level;
    const log = new Logger(test.appName, test.corrId, test.key);
    log.debug("text debug");
    log.info("text info");
    log.warn("text warn");
    log.error("text error");

    passedCounter++;
    console.log("---------------------------------------");
}

console.log(`EXECUTED ${tests.length} TEST CASES. PASSED: ${passedCounter} - FAILED: ${tests.length-passedCounter}`);