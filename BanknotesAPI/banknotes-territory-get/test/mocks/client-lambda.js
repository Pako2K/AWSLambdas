"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
                    "id": 1,
                    "iso3": "AFG",
                    "name": "Afghanistan",
                    "continentId": 5,
                    "territoryTypeId": 3,
                    "iso2": "AF",
                    "officialName": "Afggggg",
                    "start": 1919,
                    "end": 2034,
                    "parentId": 213,
                    "successors": "214,215",
                    "description": "desc"
                },
                {
                    "id": 2,
                    "iso3": "ALB",
                    "name": "Albania",
                    "continentId": 6,
                    "territoryTypeId": 3,
                    "iso2": null,
                    "officialName": "Afggggg",
                    "start": 1912,
                    "end": null,
                    "parentId": null,
                    "successors": "214",
                    "description": null
                },
                {
                    "id": 3,
                    "iso3": "DZA",
                    "name": "Algeria",
                    "continentId": 2,
                    "territoryTypeId": 1,
                    "iso2": null,
                    "officialName": "Afggggg",
                    "start": 1912,
                    "end": null,
                    "parentId": null,
                    "successors": null,
                    "description": null
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