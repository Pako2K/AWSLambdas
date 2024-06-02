"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const mailer = require('nodemailer');

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const VAL_CODE_LENGTH = 8;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
    - body          : payload
*/
exports.handler = async function(event) {
    const log = new Logger("user-post", event.correlationId, event.key);

    let username = event.body.username
    let email = event.body.email

    // Check to avoid SQL injection
    if (username.split(' ').length > 1 || email.split(' ').length > 1) {
        return response(log, 400, exceptionJSON("RES-03", "Invalid username or email"))
    }

    log.info(`Sign up requested by: ${username}`);

    // Check that the username and the email exist 
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = '${username}'
                            AND cre_mail = '${email}'`;

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
            return response(log, 500, exceptionJSON("RES-06", body))
        }

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        if (!body.length) {
            // User does not exists
            return response(log, 403, exceptionJSON("RES-07", "Username or email not found"))
        } else {
            if (body[0].cre_state === 0) {


            } else {
                // User found but not activated!
                return response(log, 403, exceptionJSON("RES-07", "User not activated"))
            }
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("RES-99", err.message || err.exception))
    }

    try {
        // Generate validation code
        let validationCode = crypto.randomBytes(Math.ceil(VAL_CODE_LENGTH / 2)).toString('hex').slice(0, VAL_CODE_LENGTH);

        // Create session id to be used during the confirmation of the user (using the validation code)
        const tokenExpiration = 300000
        const token = jwt.sign({ username }, process.env.TOKEN_SECRET, { expiresIn: tokenExpiration });

        // Send email with validation code
        // Read configuration properties from file
        const mailConfig = JSON.parse(fs.readFileSync(`./mail.config.json`));

        // Setup mail transport
        mailConfig.SMTPTransport.auth.pass = process.env.MAIL_PWD;
        let mailTransport = mailer.createTransport(mailConfig.SMTPTransport);
        mailConfig.pwdChangeOptions.to = email;
        mailConfig.pwdChangeOptions.html = mailConfig.pwdChangeOptions.htmlTemplate.replace("%%USERNAME%%", username)
            .replace("%%CODE%%", validationCode).replace("%%EXPIRATION%%", tokenExpiration / 60000);

        let mailResult = await mailTransport.sendMail(mailConfig.pwdChangeOptions)

        log.info(`Validation mail sent to ${email}. User Name: ${username}. ${mailResult.response}`);

        // Store validation code and state in DB's and send reply
        const sqlUpdateUserCredential = `UPDATE cre_credentials SET cre_state = -1, cre_validation_code = '${validationCode}' 
                                        WHERE cre_username = '${username}'
                                        AND cre_mail = '${email}'`;

        const commandParams = {
            FunctionName: "banknotes-db",
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({ sql: sqlUpdateUserCredential, correlationId: event.correlationId, key: event.key })
        };

        const command = new InvokeCommand(commandParams);

        log.info(`Update Request sent: ${JSON.stringify(command)}`);

        // Call data provider
        const result = await lambdaClient.send(command);
        const respStr = new TextDecoder().decode(result.Payload);

        const respJSON = JSON.parse(respStr);

        log.info(`Response received: ${respJSON.statusCode}`);

        let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

        if (status != 200) {
            return response(log, 500, exceptionJSON("RES-99", respJSON.body))
        }

        return response(log, 200, { id: token, isAdmin: false, expiration: tokenExpiration })

    } catch (exc) {
        log.error(`Error: ${exc}`);
        return response(log, 500, exceptionJSON("RES-99", exc.message || exc.exception))
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