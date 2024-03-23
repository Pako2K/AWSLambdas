"use strict"

const { Logger } = require('logger');
const { execAPI } = require('./api/controller');


exports.handler = async function(event, context) {
    event.headers["x-correlation-id"] = event.headers["x-correlation-id"] || `CID-${event.requestContext.timeEpoch}`;

    const log = new Logger("Banknotes-Server", event.headers["x-correlation-id"]);

    log.info(`Request received: ${JSON.stringify(event.requestContext.http)}, query string: ${event.rawQueryString}`);
    log.debug(`Context: ${JSON.stringify(context)}`);

    // Call API
    let status, body;
    try {
        const result = await execAPI(event);
        status = result.statusCode;
        body = result.body;
    } catch (err) {
        log.error(`Error: ${JSON.stringify(err)}`);
        status = err.status;
        body = JSON.stringify({ exception: err.exception });
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};