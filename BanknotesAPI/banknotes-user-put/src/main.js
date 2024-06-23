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

    // Validate credentials (must be the an Administrator)
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

    let adminUser = usrPwdArray[0];
    let adminPwd = usrPwdArray[1];

    // Check to avoid SQL injection
    if (adminUser.split(' ').length > 1 || adminPwd.split(' ').length > 1) {
        return response(log, 400, exceptionJSON("REG-03", "Invalid username:password in 'authorization' header"))
    }

    const sqlSelectCredentials = `SELECT cre_salt, cre_hashed_pwd FROM cre_credentials WHERE cre_is_admin = 1 AND cre_state = 100 AND cre_username = '${adminUser}'`

    try {
        let respJSON = await execQuery(log, sqlSelectCredentials, event.correlationId, event.key);
        let body = respJSON.body;

        if (respJSON.statusCode == undefined || respJSON.statusCode != 200) {
            return response(log, 500, exceptionJSON("REG-99", body))
        }

        // Calculate hashed password and compare to the returned one
        if (body == null || body.length != 1 || body[0].cre_hashed_pwd !== encryptPwd(body[0].cre_salt, adminPwd)) {
            // Unauthorized
            return response(log, 401, exceptionJSON("REG-04", `User ${adminUser} not found or wrong password`));
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("REG-99", err))
    }

    // Credentials have been validated. Now the new user can be registered
    let username = event.body.username;
    let password = event.body.password;
    let email = event.body.email

    if (username.length > 16 || username.length < 3) {
        return response(log, 400, exceptionJSON("REG-10", "Username is too short (less than 3 characters) or too long (more than 16 characters)"))
    }
    if (password.length > 32 || password.length < 8) {
        return response(log, 400, exceptionJSON("REG-11", "Password is too short (less than 8 characters) or too long (more than 32 characters)"))
    }


    // Check to avoid SQL injection
    if (username.split(' ').length > 1) {
        return response(log, 400, exceptionJSON("REG-12", "Invalid username"))
    }

    log.info(`Sign up requested by: ${username}`);

    // Check that the username and the email are not already used 
    const sqlSelectUser = ` SELECT * FROM cre_credentials
                            WHERE cre_username = '${username}'
                            OR cre_mail = '${email}'`;
    try {
        let respJSON = await execQuery(log, sqlSelectUser, event.correlationId, event.key);

        let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        let body = respJSON.body;

        if (status != 200) {
            return response(log, 500, exceptionJSON("REG-99", body))
        }

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        if (body.length) {
            if (body[0].cre_state === 0) {
                // User already exists!
                return response(log, 403, exceptionJSON("REG-13", "Username or email is already registered"))
            } else {
                // Retrieve Insertion Timestamp and compare it to the current timestamp
                let now = moment();
                let insertTimestamp = moment(body[0].cre_insert_timestamp);
                if ((now.diff(insertTimestamp, 'seconds')) > 300) {
                    // Delete "expired" user and continue
                    const sqlDeleteUser = `DELETE FROM cre_credentials WHERE cre_username = '${username}'`;

                    let respJSON = await execQuery(log, sqlDeleteUser, event.correlationId, event.key)

                    status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

                    if (status != 200) {
                        return response(log, 500, exceptionJSON("REG-99", respJSON.body))
                    }
                } else {
                    // User already exists!
                    return response(log, 400, exceptionJSON("REG-13", "Username or email is already registered"))
                }
            }
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("REG-99", err))
    }

    // Validate password and send Confirmation mail
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

        let respJSON = await execQuery(log, sqlInsertUserCredential, event.correlationId, event.key)

        let status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;

        if (status != 200) {
            return response(log, 500, exceptionJSON("REG-99", respJSON.body))
        }

        return response(log, 200, { id: token, isAdmin: false, expiration: tokenExpiration })

    } catch (exc) {
        log.error(`Error: ${exc}`);
        if (exc.message.includes("550 invalid DNS"))
            return response(log, 400, exceptionJSON("REG-20", exc))
        else
            return response(log, 500, exceptionJSON("REG-99", exc))
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