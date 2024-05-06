"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const PARAM_USER = "$USER"
const PARAM_ID = "$VARIANT_ID"
const sqlDeleteItem = `DELETE FROM bit_item WHERE bit_id = ${PARAM_ID} AND bit_usr_id = (SELECT usr_id FROM usr_user WHERE usr_name = '${PARAM_USER}')
                   `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
    - path          : /item/{id}
*/
exports.handler = async function(event) {
    const log = new Logger("Item-Delete", event.correlationId, event.key);

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 400, exceptionJSON("ERR-01", "Missing parameter in query string"));

    let username = event.queryStrParams.user;

    let pathTokens = event.path.split("/")
    if (pathTokens.length != 3 || !parseInt(pathTokens[2]))
        return response(log, 400, exceptionJSON("ERR-02", "Missing or invalid item id"));

    // Build query string 

    let sql = sqlDeleteItem.replace(PARAM_ID, pathTokens[2]).replace(PARAM_USER, username)

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
        body = respJSON.body
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    return response(log, status, body);
};



function exceptionJSON(code, description) {
    return { code: code, description: description }
}


function response(log, status, bodyJSON) {
    const response = {
        statusCode: status,
        body: JSON.stringify(bodyJSON)
    };
    log.info(`Response sent: HTTP ${status}`);
    return response;
}