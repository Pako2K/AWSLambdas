"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        let payload;
        let respStr;
        switch (command.params.FunctionName) {
            case "banknotes-item-post":
                respStr = JSON.stringify({
                    "statusCode": 200,
                    "body": {
                        "item": {
                            "id": 4,
                            "variantId": 1,
                            "grade": "XF",
                            "quantity": 1,
                            "price": 5,
                            "seller": "Bank",
                            "purchaseDate": "2002-03-01",
                            "description": "Prefix 'V'. Printer Code 'M'"
                        },
                        "continent": {
                            "id": 6,
                            "name": "Europe"
                        },
                        "territory": {
                            "id": 245,
                            "name": "Euro Area"
                        },
                        "currency": {
                            "id": 74,
                            "name": "Euro"
                        },
                        "denomination": 5,
                        "catalogId": "P-1"
                    }
                });
                payload = new TextEncoder().encode(respStr);
                break;
            case "banknotes-continent-get":
                respStr = JSON.stringify({ "statusCode": 200, "body": [{ "id": 4, "name": "Africa" }, { "id": 2, "name": "North America" }, { "id": 3, "name": "South America" }, { "id": 5, "name": "Asia" }, { "id": 6, "name": "Europe" }, { "id": 7, "name": "Oceania" }] });
                payload = new TextEncoder().encode(respStr);
                break;
            case "banknotes-territorytype-get":
                respStr = JSON.stringify({ "statusCode": 200, "body": [] });
                payload = new TextEncoder().encode(respStr);
                break;
            case "banknotes-currency-issue-get":
                respStr = JSON.stringify({ "statusCode": 200, "body": [] });
                payload = new TextEncoder().encode(respStr);
                break;
            default:
        }

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