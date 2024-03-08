"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
                    "issueYear": 1985,
                    "continentId": 3,
                    "continentName": "South A",
                    "numTerritories": 1,
                    "numCurrencies": 1,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 1,
                    "numVariants": 1
                },
                {
                    "issueYear": 1991,
                    "continentId": 2,
                    "continentName": "South A",
                    "numTerritories": 1,
                    "numCurrencies": 1,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 1,
                    "numVariants": 1
                },
                {
                    "issueYear": 1991,
                    "continentId": 3,
                    "continentName": "South A",
                    "numTerritories": 3,
                    "numCurrencies": 3,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 3,
                    "numVariants": 4
                },
                {
                    "issueYear": 1991,
                    "continentId": 4,
                    "continentName": "South A",
                    "numTerritories": 3,
                    "numCurrencies": 3,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 3,
                    "numVariants": 3
                },
                {
                    "issueYear": 1991,
                    "continentId": 5,
                    "continentName": "South A",
                    "numTerritories": 7,
                    "numCurrencies": 8,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 10,
                    "numVariants": 20
                },
                {
                    "issueYear": 1991,
                    "continentId": 6,
                    "continentName": "South A",
                    "numTerritories": 1,
                    "numCurrencies": 1,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 1,
                    "numVariants": 1
                },
                {
                    "issueYear": 1999,
                    "continentId": 6,
                    "continentName": "South A",
                    "numTerritories": 2,
                    "numCurrencies": 1,
                    "numSeries": 1,
                    "numDenominations": 1,
                    "numNotes": 2,
                    "numVariants": 6
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