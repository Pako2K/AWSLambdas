"use strict"

const { Logger } = require('logger');
const { execAPI } = require('./api/controller');


exports.handler = async function(event, context) {
    event.headers["x-correlation-id"] = event.headers["x-correlation-id"] || `CID-${event.requestContext.timeEpoch}`;

    const log = new Logger("Banknotes-Server", event.headers["x-correlation-id"]);

    log.info(`Request received: ${JSON.stringify(event.requestContext.http)}, query string: ${JSON.stringify(event.queryStringParameters)}`);
    log.debug(`Context: ${JSON.stringify(context)}`);
    log.debug(`Body: ${JSON.stringify(event.body)}`);


    // Call API
    let status, body;
    try {
        const result = await execAPI(event);
        status = result.statusCode;
        body = result.body;
    } catch (err) {
        log.error(`Error: ${JSON.stringify(err)}`);
        status = err.status;
        body = { exception: err.exception };
    }

    return response(log, status, body);
};


function response(log, status, bodyJSON) {
    const response = {
        statusCode: status,
        body: bodyJSON
    };
    log.info(`Response sent: HTTP ${status}`);
    return response;
}