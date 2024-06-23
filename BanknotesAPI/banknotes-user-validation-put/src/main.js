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

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 500, exceptionJSON("VAL-99", "Missing parameter in query string"));

    // Get username and validate
    let username = event.queryStrParams.user;

    try {
        // Check that the validation code is correct
        const sqlSelectUser = ` SELECT * FROM cre_credentials
                                WHERE cre_username = '${username}'`;

        let respJSON = await execQuery(log, sqlSelectUser, event.correlationId, event.key)

        let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        let body = respJSON.body;

        if (status != 200) {
            return response(log, 500, exceptionJSON("VAL-99", body))
        }

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        if (body.length == 0) {
            return response(log, 400, exceptionJSON("VAL-01", `User not found`))
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

                let respJSON2 = await execQuery(log, sqlUpdateState, event.correlationId, event.key)

                status = respJSON2.statusCode == undefined ? 500 : respJSON2.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON2.body))
                }

                return response(log, 403, exceptionJSON("VAL-10", `Validation code is wrong. ${3 - newState} attempts left.`))

            } else {
                // Cancel registration
                // Delete user
                const sqlDeleteUser = `DELETE FROM cre_credentials WHERE cre_username = '${username}'`;

                let respJSON3 = await execQuery(log, sqlDeleteUser, event.correlationId, event.key)

                status = respJSON3.statusCode == undefined ? 500 : respJSON3.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON3.body))
                }

                return response(log, 403, exceptionJSON("VAL-11", `Validation code is wrong. Registration has been cancelled`));
            }

        } else {
            // Confirm registration: update State and CatalogDB table
            // Update state
            const sqlUpdateState = `UPDATE cre_credentials SET cre_state = 0,  cre_validation_code = NULL WHERE cre_username = '${username}'`;

            let respJSON4 = await execQuery(log, sqlUpdateState, event.correlationId, event.key)

            status = respJSON4.statusCode == undefined ? 500 : respJSON4.statusCode;

            if (status != 200) {
                return response(log, 500, exceptionJSON("VAL-99", respJSON4.body))
            }

            // Copy username to catalogueDB
            const sqlInsertUserCatalogue = `INSERT INTO usr_user (usr_name) VALUES ('${username}')`;

            let respJSON5 = await execQuery(log, sqlInsertUserCatalogue, event.correlationId, event.key)

            status = respJSON5.statusCode == undefined ? 500 : respJSON5.statusCode;

            if (status != 200) {
                return response(log, 500, exceptionJSON("VAL-99", respJSON5.body))
            }

            return response(log, 200, {})
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("VAL-99", err))
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


async function execQuery(log, sqlStr, correlationId, key) {
    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlStr, correlationId: correlationId, key: key })
    };

    const command = new InvokeCommand(commandParams);

    log.info(`Request sent: ${JSON.stringify(commandParams)}`);

    // Call data provider
    const result = await lambdaClient.send(command);
    const respStr = new TextDecoder().decode(result.Payload);

    const respJSON = JSON.parse(respStr);

    log.info(`Response received: ${respJSON.statusCode}`);

    return respJSON;
}