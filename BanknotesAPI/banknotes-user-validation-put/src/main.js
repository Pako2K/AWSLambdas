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
    const log = new Logger("user-validation-put", event.correlationId, event.key);

    let status, body;

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 500, exceptionJSON("VAL-01", "Missing parameter in query string"));


    // Get username and validate
    let username = event.queryStrParams.user;

    // Check that the validation code is correct
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = '${username}'`;

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlSelectUser, correlationId: event.correlationId, key: event.key })
    };

    try {
        const command = new InvokeCommand(commandParams);

        log.info(`Request sent: ${JSON.stringify(commandParams)}`);

        // Call data provider
        const result = await lambdaClient.send(command);
        const respStr = new TextDecoder().decode(result.Payload);

        const respJSON = JSON.parse(respStr);

        log.info(`Response received: ${respJSON.statusCode}`);

        status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        body = respJSON.body;

        if (status != 200) {
            return response(log, 500, exceptionJSON("VAL-99", body))
        }

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        if (body.length == 0) {
            return response(log, 500, exceptionJSON("VAL-99", `User not found`))
        }

        if (body[0].cre_state === 0) {
            // User already activated!
            return response(log, 200, {})
        }

        if (body[0].cre_validation_code !== event.body.validationCode) {
            let newState;
            if (body[0].cre_state === -1) newState = 1;
            else if (body[0].cre_state === 1) newState = 2;
            else newState = 3;

            if (newState < 3) {
                // Update state
                const sqlUpdateState = `UPDATE cre_credentials SET cre_state = ${newState} WHERE cre_username = '${username}'`;

                const commandParamsUpdate = {
                    FunctionName: "banknotes-db",
                    InvocationType: "RequestResponse",
                    Payload: JSON.stringify({ sql: sqlUpdateState, correlationId: event.correlationId, key: event.key })
                };

                const commandUpdate = new InvokeCommand(commandParamsUpdate);

                log.info(`Update request sent: ${JSON.stringify(commandParamsUpdate)}`);

                // Call data provider
                const result2 = await lambdaClient.send(commandUpdate);
                const respStr2 = new TextDecoder().decode(result2.Payload);

                const respJSON2 = JSON.parse(respStr2);

                log.info(`Response received: ${respJSON2.statusCode}`);

                status = respJSON2.statusCode == undefined ? 500 : respJSON2.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON2.body))
                }

                return response(log, 403, exceptionJSON("VAL-04", `Validation code is wrong. ${3 - newState} attempts left.`))

            } else {
                // Cancel registration
                // Delete user
                const sqlDeleteUser = `DELETE FROM cre_credentials WHERE cre_username = '${username}'`;

                const commandParamsDelete = {
                    FunctionName: "banknotes-db",
                    InvocationType: "RequestResponse",
                    Payload: JSON.stringify({ sql: sqlDeleteUser, correlationId: event.correlationId, key: event.key })
                };

                const commandDelete = new InvokeCommand(commandParamsDelete);

                log.info(`Delete request sent: ${JSON.stringify(commandParamsDelete)}`);

                // Call data provider
                const result3 = await lambdaClient.send(commandDelete);
                const respStr3 = new TextDecoder().decode(result3.Payload);

                const respJSON3 = JSON.parse(respStr3);

                log.info(`Response received: ${respJSON3.statusCode}`);

                status = respJSON3.statusCode == undefined ? 500 : respJSON3.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON3.body))
                }

                return response(log, 403, exceptionJSON("VAL-05", `Validation code is wrong. Registration has been cancelled`));
            }

        } else {
            // Confirm registration: update State and CatalogDB table
            // Update state
            const sqlUpdateState = `UPDATE cre_credentials SET cre_state = 0,  cre_validation_code = NULL WHERE cre_username = '${username}'`;

            const commandParamsUpdate = {
                FunctionName: "banknotes-db",
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({ sql: sqlUpdateState, correlationId: event.correlationId, key: event.key })
            };

            const command = new InvokeCommand(commandParamsUpdate);

            log.info(`Update request sent: ${JSON.stringify(commandParamsUpdate)}`);

            // Call data provider
            const result = await lambdaClient.send(command);
            const respStr = new TextDecoder().decode(result.Payload);

            const respJSON = JSON.parse(respStr);

            log.info(`Response received: ${respJSON.statusCode}`);

            status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

            if (status != 200) {
                return response(log, 500, exceptionJSON("VAL-99", respJSON.body))
            }

            // Copy username to catalogueDB
            const sqlInsertUserCatalogue = `INSERT INTO usr_user (usr_name) VALUES ('${username}')`;

            const commandParamsInsert = {
                FunctionName: "banknotes-db",
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({ sql: sqlInsertUserCatalogue, correlationId: event.correlationId, key: event.key })
            };

            const commandInsert = new InvokeCommand(commandParamsInsert);

            log.info(`Update request sent: ${JSON.stringify(commandParamsInsert)}`);

            // Call data provider
            const result2 = await lambdaClient.send(commandInsert);
            const respStr2 = new TextDecoder().decode(result2.Payload);

            const respJSON2 = JSON.parse(respStr2);

            log.info(`Response received: ${respJSON2.statusCode}`);

            status = respJSON2.statusCode == undefined ? 500 : respJSON2.statusCode;

            if (status != 200) {
                return response(log, 500, exceptionJSON("VAL-99", respJSON2.body))
            }

            return response(log, 200, {})
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("VAL-99", err.message || err.exception))
    }
};


function exceptionJSON(code, description) {
    return { exception: { code: code, description: description } }
}


function response(log, status, bodyJSON) {
    const response = {
        statusCode: status,
        body: JSON.stringify(bodyJSON)
    };
    log.info(`Response sent: HTTP ${status}`);
    return response;
}