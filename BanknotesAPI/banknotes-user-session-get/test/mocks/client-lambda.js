"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({
            "statusCode": 200,
            "body": [{
                "cre_salt": "1985",
                "cre_hashed_pwd": "hashpwd",
                "isAdmin": false,
                "state": 0
            }]
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