"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
                    "id": 1,
                    "iso3": null,
                    "name": "Afghanistan",
                    "continentId": 5,
                    "territoryTypeId": 3,
                    "start": 1919,
                    "end": null
                },
                {
                    "id": 2,
                    "iso3": "ALB",
                    "name": "Albania",
                    "continentId": 6,
                    "territoryTypeId": 3,
                    "start": 1912,
                    "end": null,
                },
                {
                    "id": 3,
                    "iso3": "DZA",
                    "name": "Algeria",
                    "continentId": 4,
                    "territoryTypeId": 3,
                    "start": 1962,
                    "end": 2099
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