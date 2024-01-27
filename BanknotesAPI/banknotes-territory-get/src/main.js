"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sql = `SELECT ter_id as id, ter_iso3 as iso3, ter_name as name, ter_con_id as "continentId", 
                    ter_tty_id as "territoryTypeId", ter_start as start, ter_end as end
            FROM ter_territory
            ORDER BY ter_name`;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
*/
exports.handler = async function(event) {
    const log = new Logger("Territory-Get", event.correlationId, event.key);

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
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    // Add URI and remove optional fields
    if (status == 200) {
        for (let ter of body) {
            ter.uri = `https://${event.domainName}/territory/${ter.id}`
            if (ter.iso3 == null) delete ter.iso3
            if (ter.end == null) delete ter.end
        }
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};