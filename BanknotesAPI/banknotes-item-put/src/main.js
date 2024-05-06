"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();


/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
    - body          : payload
*/
exports.handler = async function(event) {
    const log = new Logger("Item-Put", event.correlationId, event.key);

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 400, exceptionJSON("ERR-01", "Missing parameter in query string"));

    let username = event.queryStrParams.user;

    // Build query string 
    if (event.body.seller) event.body.seller = `'${event.body.seller.replaceAll("'", '"')}'`
    else event.body.seller = "NULL"
    if (event.body.purchaseDate) event.body.purchaseDate = `'${event.body.purchaseDate}'`
    else event.body.purchaseDate = "NULL"
    if (event.body.description) event.body.description = `'${event.body.description.replaceAll("'", '"')}'`
    else event.body.description = "NULL"
    let sqlUpdateItem = `UPDATE bit_item 
                        SET bit_quantity = ${event.body.quantity}, bit_gra_grade = '${event.body.grade}', bit_price = ${event.body.price},
                             bit_seller = ${event.body.seller}, bit_purchase_date = ${event.body.purchaseDate}, bit_description = ${event.body.description}
                        WHERE bit_id = ${event.body.id} AND bit_usr_id = (SELECT usr_id FROM usr_user WHERE usr_name = '${username}')
                        `;

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlUpdateItem, correlationId: event.correlationId, key: event.key })
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
        body = respJSON.body;
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