"use strict";

class LambdaClient {
    constructor(config) {}
    async send(command) {
        const respStr = JSON.stringify({ "statusCode": 200, "body": '[{"id":4,"name":"Africa"},{"id":2,"name":"North America"},{"id":3,"name":"South America"},{"id":5,"name":"Asia"},{"id":6,"name":"Europe"},{"id":7,"name":"Oceania"}]' });

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