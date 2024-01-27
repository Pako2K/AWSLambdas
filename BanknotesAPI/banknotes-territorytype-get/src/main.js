"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sql = `SELECT  tty_id AS id, tty_name AS name, tty_abbr AS abbreviation, tty_desc AS description
                FROM tty_territory_type
                WHERE tty_order NOTNULL
                ORDER BY tty_order`;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
*/
exports.handler = async function(event) {
    const log = new Logger("TerritoryType-Get", event.correlationId, event.key);

    log.info(`Request received`);

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sql, correlationId: event.correlationId, key: event.key })
    };

    let status, body;
    try {
        const command = new InvokeCommand(commandParams);

        log.info(`Request sent: ${JSON.stringify(commandParams)}`);

        // Call data provider
        const response = await lambdaClient.send(command);
        const respStr = new TextDecoder().decode(response.Payload);

        log.info(`Response received: ${respStr}`);

        const respJSON = JSON.parse(respStr);

        status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        body = respJSON.body == undefined ? respStr : respJSON.body;
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = { exception: err.message || err.exception };
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};