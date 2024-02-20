"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
                    "id": 1,
                    "name": "Afghanistan",
                    "numCurrencies": 2,
                    "numSeries": 5,
                    "numDenominations": 13,
                    "numNotes": 22,
                    "numVariants": 221,
                },
                {
                    "id": 2,
                    "name": "Albania",
                    "numCurrencies": 1,
                    "numSeries": 1,
                    "numDenominations": 113,
                    "numNotes": 212,
                    "numVariants": 221,
                },
                {
                    "id": 3,
                    "name": "Algeria",
                    "numCurrencies": 2,
                    "numSeries": 5,
                    "numDenominations": 13,
                    "numNotes": 22,
                    "numVariants": 221,
                }
            ]
        });

        const payload = new TextEncoder().encode(respStr);

        return { Payload: payload };
    }
};

class InvokeCommand {
    constructor(params) {
        this.params = params;
    }
};

exports.LambdaClient = LambdaClient;
exports.InvokeCommand = InvokeCommand;