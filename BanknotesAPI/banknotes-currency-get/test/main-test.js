const TESTED_JS = 'main.js'

const tests = [{
    name: 'test-success',
    result: {
        statusCode: 200,
        body: [
            { "id": 18, "iso3": "AUD", "name": "Dollar", "continent": { "id": 7, "name": "Africa" }, "namePlural": "Dollars", "fullName": "Australian dollar", "symbol": "$", "start": "1966-02-14", "ownedBy": [{ "territory": { "id": 13, "name": "ABC" }, "start": "1966-02-14" }], "description": "The Australian dollar was introduced on 14 February 1966 to replace the pre-decimal Australian pound, with the conversion rate of A$2 per = A£1. The Australian dollar was legal tender of Papua New Guinea until 31 December 1975, when the Papua New Guinean kina became sole legal tender, and of the Solomon Islands until 1977, when the Solomon Islands dollar became sole legal tender.", "uri": "https://host/currency?id=18", "sharedBy": [{ "territory": { "id": 112, "name": "ABC" }, "start": "1979" }], "usedBy": [{ "territory": { "id": 220, "name": "ABC" }, "start": "1978" }] },
            { "id": 77, "iso3": "FKP", "name": "Pound", "continent": { "id": 7, "name": "Africa" }, "namePlural": "Pounds", "fullName": "Falkland Islands pound", "symbol": "£", "start": "1899", "ownedBy": [{ "territory": { "id": 70, "name": "ABC" }, "start": "1899" }], "units": [{ "id": 85, "name": "Shilling", "namePlural": "Shillings", "value": 20, "abbreviation": "s" }, { "id": 86, "name": "Penny", "namePlural": "Pence", "value": 100, "abbreviation": "p" }], "description": "The pound was introduced following the reassertion of sovereignty in the Falklands Islands by the British in 1833.\nSpecific issues of banknotes have been made for the Falkland Islands since 1899, authorised by the Falkland Islands Currency Notes Order 1899. In 1971, the pound was decimalised and subdivided into 100 pence. Coins have been minted specifically for the Falklands since 1974.", "uri": "https://host/currency?id=77" },
            { "id": 44, "iso3": "BYB", "name": "Ruble", "continent": { "id": 7, "name": "Africa" }, "namePlural": "Rubles", "fullName": "Belarusian ruble", "symbol": "Br", "start": "1992-05", "end": "1999-12-31", "ownedBy": [{ "territory": { "id": 20, "name": "ABC" }, "start": "1992-05", "end": "1999-12-31" }], "successor": { "id": 46, "rate": 1000 }, "units": [{ "id": 35, "name": "Kapeek", "namePlural": "Kapeek", "value": 100 }], "description": "From the collapse of the Soviet Union until May 1992, the Soviet ruble circulated in Belarus. New Russian banknotes also circulated in Belarus, but they were replaced by notes issued by the National Bank of the Republic of Belarus in May 1992. The first Belarusian ruble replaced the Soviet currency at the rate of 1 Belarusian ruble = 10 Soviet rubles.", "uri": "https://host/currency?id=44" },
            { "id": 17, "iso3": "ATS", "name": "Schilling", "continent": { "id": 7, "name": "Africa" }, "namePlural": "Schilling", "fullName": "Austrian schilling", "symbol": "S", "start": "1945", "end": "2002-02-28", "ownedBy": [{ "territory": { "id": 14, "name": "ABC" }, "start": "1945", "end": "2002-02-28" }], "successor": { "id": 74, "rate": 13.7603 }, "description": "The schilling was reintroduced after World War II on November 30, 1945, by the Allied Military, who issued paper money (dated 1944) in denominations of 50 groschen, 2, 5, 10, 20, 25, 50, 100, and 1000 schilling. The exchange rate to the reichsmark was 1:1, limited to 150 schilling per person. \r\nAlthough the euro became the official currency of Austria in 1999, euro coins and notes were not introduced until 2002. Old schilling denominated coins and notes were phased out from circulation because of the introduction of the euro by 28 February of that year. Schilling banknotes and coins which were valid at the time of the introduction of the euro will indefinitely remain exchangeable for euros at any branch of the Oesterreichische Nationalbank.", "uri": "https://host/currency?id=17" }
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