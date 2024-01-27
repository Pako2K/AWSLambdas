"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
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