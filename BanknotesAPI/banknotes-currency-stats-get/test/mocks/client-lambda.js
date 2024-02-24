"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
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