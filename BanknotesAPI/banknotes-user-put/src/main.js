"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const moment = require('moment');
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
    const log = new Logger("user-put", event.correlationId, event.key);

    let status, body;

    // Read from Authorization header
    let authHeader = event.headers.Authorization || event.headers.authorization

    if (!authHeader) {
        return response(log, 400, exceptionJSON("REG-01", "Http header (authorization) not provided"))
    }

    // Extract username and password
    // Authorization looks like  "Basic Y2hhcmxlczoxMjM0NQ==". The second part is in base64(user:pwd)
    let tokenizedAuth = authHeader.split(' ');
    if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Basic") {
        return response(log, 400, exceptionJSON("REG-02", "Value of Http header (authorization) is not Basic Authorization"))
    }

    // Decode string user:pwd
    let buf = Buffer.from(tokenizedAuth[1], 'base64');
    let usrPwd = buf.toString();

    let usrPwdArray = usrPwd.split(':'); // split on a ':'
    if (usrPwdArray.length !== 2) {
        return response(log, 400, exceptionJSON("REG-03", "Invalid username:password in 'authorization' header"))
    }

    let username = usrPwdArray[0];
    let password = usrPwdArray[1];
    let email = event.body.email

    if (username.length > 16 || username.length < 3) {
        return response(log, 400, exceptionJSON("REG-04", "Username is too short (less than 3 characters) or too long (more than 16 characters)"))
    }
    if (password.length > 32 || password.length < 8) {
        return response(log, 400, exceptionJSON("REG-05", "Password is too short (less than 8 characters) or too long (more than 32 characters)"))
    }


    // Check to avoid SQL injection
    if (username.split(' ').length > 1) {
        return response(log, 400, exceptionJSON("REG-03", "Invalid username:password in 'authorization' header"))
    }

    log.info(`Sign up requested by: ${username}`);

    // Check that the username and the email are not already used 
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = '${username}'
                            OR cre_mail = '${email}'`;

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
            return response(log, 500, exceptionJSON("REG-06", body))
        }

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        if (body.length) {
            if (body[0].cre_state === 0) {
                // User already exists!
                return response(log, 403, exceptionJSON("REG-07", "Username or email is already registered"))
            } else {
                // Retrieve Insertion Timestamp and compare it to the current timestamp
                let now = moment();
                let insertTimestamp = moment(body[0].cre_insert_timestamp);
                if ((now.diff(insertTimestamp, 'seconds')) > 300) {
                    // Delete "expired" user and continue
                    const sqlDeleteUser = `DELETE FROM cre_credentials WHERE cre_username = '${username}'`;

                    const deleteCommandParams = {
                        FunctionName: "banknotes-db",
                        InvocationType: "RequestResponse",
                        Payload: JSON.stringify({ sql: sqlDeleteUser, correlationId: event.correlationId, key: event.key })
                    };

                    const deleteCommand = new InvokeCommand(deleteCommandParams);

                    log.info(`Deletion Request sent: ${JSON.stringify(deleteCommandParams)}`);

                    // Call data provider
                    const result2 = await lambdaClient.send(deleteCommand);
                    const respStr2 = new TextDecoder().decode(result2.Payload);

                    const respJSON2 = JSON.parse(respStr2);

                    log.info(`Response received: ${respJSON2.statusCode}`);

                    status = respJSON2.statusCode == undefined ? 500 : respJSON2.statusCode;

                    if (status != 200) {
                        return response(log, 500, exceptionJSON("REG-08", respJSON2.body))
                    }
                } else {
                    // User already exists!
                    return response(log, 403, exceptionJSON("REG-07", "Username or email is already registered"))
                }
            }
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("REG-99", err.message || err.exception))
    }

    try {
        // Calculate Salt 
        const saltLength = 32;
        let salt = crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').slice(0, saltLength);

        // Create password hash
        let hashedPwd = encryptPwd(salt, password);

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
        mailConfig.registrationOptions.to = email;
        mailConfig.registrationOptions.html = mailConfig.registrationOptions.htmlTemplate.replace("%%USERNAME%%", username)
            .replace("%%CODE%%", validationCode).replace("%%EXPIRATION%%", tokenExpiration / 60000);

        let mailResult = await mailTransport.sendMail(mailConfig.registrationOptions)

        log.info(`Validation mail sent to ${email}. User Name: ${username}. ${mailResult.response}`);

        // Store credentials in DB's and send reply
        const sqlInsertUserCredential = `INSERT INTO cre_credentials (cre_username, cre_salt, cre_hashed_pwd, cre_mail, cre_is_admin, cre_validation_code, cre_state)
                                        VALUES ('${username}', '${salt}', '${hashedPwd}', '${email}', 0, '${validationCode}', -1)`;

        const insertCommandParams = {
            FunctionName: "banknotes-db",
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({ sql: sqlInsertUserCredential, correlationId: event.correlationId, key: event.key })
        };

        const insertCommand = new InvokeCommand(insertCommandParams);

        log.info(`Insert Request sent: ${JSON.stringify(insertCommand)}`);

        // Call data provider
        const result3 = await lambdaClient.send(insertCommand);
        const respStr3 = new TextDecoder().decode(result3.Payload);

        const respJSON3 = JSON.parse(respStr3);

        log.info(`Response received: ${respJSON3.statusCode}`);

        status = respJSON3.statusCode == undefined ? 500 : respJSON3.statusCode;

        if (status != 200) {
            return response(log, 500, exceptionJSON("REG-90", respJSON3.body))
        }

        return response(log, 200, { id: token, isAdmin: false, expiration: tokenExpiration })

    } catch (exc) {
        log.error(`Error: ${exc}`);
        return response(log, 500, exceptionJSON("REG-91", exc.message || exc.exception))
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