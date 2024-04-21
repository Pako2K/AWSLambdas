"use strict";
const { Logger } = require('logger');
const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const lambdaClient = new LambdaClient();

const FUNCTION_PREFIX = "banknotes-";


exports.route = async function(operation, correlationId, domainName, headers, queryStringParams, path) {
    const log = new Logger("Banknotes-Server", correlationId);

    const commandParams = {
        FunctionName: FUNCTION_PREFIX + operation,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ correlationId: correlationId, domainName: domainName, headers, queryStrParams: queryStringParams, path: path })
    };
    const command = new InvokeCommand(commandParams);

    log.info(`Request sent: ${JSON.stringify(commandParams)}`);

    const response = await lambdaClient.send(command);
    const respStr = new TextDecoder().decode(response.Payload);

    log.info(`Response received: ${respStr}`);

    return JSON.parse(respStr);
}