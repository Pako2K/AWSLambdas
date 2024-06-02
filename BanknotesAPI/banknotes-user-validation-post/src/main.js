"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const crypto = require('crypto');
const fs = require('fs');
const mailer = require('nodemailer');

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
    const log = new Logger("user-validation-post", event.correlationId, event.key);

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 500, exceptionJSON("VAL-01", "Missing parameter in query string"));


    // Get username
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

        let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        let body = respJSON.body;

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

                let status = respJSON2.statusCode == undefined ? 500 : respJSON2.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON2.body))
                }

                return response(log, 403, exceptionJSON("VAL-04", `Validation code is wrong. ${3 - newState} attempts left.`))

            } else {
                // Cancel password change 
                const sql = `UPDATE cre_credentials SET cre_state = 0,  cre_validation_code = NULL WHERE cre_username = '${username}'`;

                const commandParams = {
                    FunctionName: "banknotes-db",
                    InvocationType: "RequestResponse",
                    Payload: JSON.stringify({ sql: sql, correlationId: event.correlationId, key: event.key })
                };

                const command = new InvokeCommand(commandParams);

                log.info(`Update request sent: ${JSON.stringify(commandParams)}`);

                // Call data provider
                const result = await lambdaClient.send(command);
                const respStr = new TextDecoder().decode(result.Payload);

                const respJSON = JSON.parse(respStr);

                log.info(`Response received: ${respJSON.statusCode}`);

                let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

                if (status != 200) {
                    return response(log, 500, exceptionJSON("VAL-99", respJSON.body))
                }

                return response(log, 403, exceptionJSON("VAL-05", `Validation code is wrong. Password change has been cancelled`));
            }

        } else {
            // Validate password
            let password = event.body.password
            if (password.length > 32 || password.length < 8) {
                return response(log, 400, exceptionJSON("VAL-01", "Password is too short (less than 8 characters) or too long (more than 32 characters)"))
            }
            // Calculate Salt 
            const saltLength = 32;
            let salt = crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').slice(0, saltLength);

            // Create password hash
            let hashedPwd = encryptPwd(salt, password);

            // Confirm password change: update password and state 
            const sqlUpdateState = `UPDATE cre_credentials SET cre_salt = '${salt}', cre_hashed_pwd = '${hashedPwd}', cre_state = 0,  cre_validation_code = NULL 
                                    WHERE cre_username = '${username}'`;

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

            let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

            if (status != 200) {
                return response(log, 500, exceptionJSON("VAL-99", respJSON.body))
            }

            // Send email with change confirmation
            // Read configuration properties from file
            const mailConfig = JSON.parse(fs.readFileSync(`./mail.config.json`));

            // Setup mail transport
            let email = body[0].cre_mail
            mailConfig.SMTPTransport.auth.pass = process.env.MAIL_PWD;
            let mailTransport = mailer.createTransport(mailConfig.SMTPTransport);
            mailConfig.confirmationPwdChangedOptions.to = email;
            mailConfig.confirmationPwdChangedOptions.html = mailConfig.confirmationPwdChangedOptions.htmlTemplate.replace("%%USERNAME%%", username);

            let mailResult = await mailTransport.sendMail(mailConfig.confirmationPwdChangedOptions)

            log.info(`Confirmation mail sent to ${email}. User Name: ${username}. ${mailResult.response}`);


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


function encryptPwd(salt, pwd) {
    // Calculate hashed password 
    let saltePwd = pwd + salt;
    let hash = crypto.createHmac('sha512', salt);
    hash.update(saltePwd);
    return hash.digest('hex');
}