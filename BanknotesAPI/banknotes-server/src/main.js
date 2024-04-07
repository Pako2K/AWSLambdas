"use strict"

const jwt = require('jsonwebtoken');

const { Logger } = require('logger');
const { execAPI } = require('./api/controller');


exports.handler = async function(event, context) {
    event.headers["x-correlation-id"] = event.headers["x-correlation-id"] || `CID-${event.requestContext.timeEpoch}`;

    const log = new Logger("Banknotes-Server", event.headers["x-correlation-id"]);

    log.info(`Request received: ${JSON.stringify(event.requestContext.http)}, query string: ${JSON.stringify(event.queryStringParameters)}`);
    log.debug(`Context: ${JSON.stringify(context)}`);

    // Validate Authorization header
    let username;
    if (event.headers) {
        let authHeader = event.headers.Authorization || event.headers.authorization;
        if (authHeader && authHeader) {
            // Extract token
            // Authorization looks like  "Bearer Y2hhcmxlcz"
            let tokenizedAuth = authHeader.split(' ');
            if (tokenizedAuth.length == 2 && tokenizedAuth[0] == "Bearer") {
                let token = tokenizedAuth[1];

                try {
                    username = jwt.verify(token, process.env.TOKEN_SECRET).username;
                    log.info(`User ${username} authenticated`);
                } catch (exception) {
                    log.error(`Error: ${JSON.stringify(exception)}`);
                    return response(log, 401, exceptionJSON(log, "ERR-11", exception.message));
                }

                // Validate username
                if (event.queryStringParameters != undefined) {
                    // Check username against received value in token
                    if (username != event.queryStringParameters.user)
                        return response(log, 403, exceptionJSON(log, "ERR-13", "User does not match"));
                } else
                    return response(log, 400, exceptionJSON(log, "ERR-01", "Missing parameter in query string"));
            }
        }
    }


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

function exceptionJSON(log, code, description) {
    log.error(`Error: ${description}`);
    return { code: code, description: description }
}


function response(log, status, bodyJSON) {
    const response = {
        statusCode: status,
        body: bodyJSON
    };
    log.info(`Response sent: HTTP ${status}`);
    return response;
}