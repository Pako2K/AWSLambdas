"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sql = `SELECT cre_salt, cre_hashed_pwd, cre_is_admin AS "isAdmin", cre_state AS "state" 
            FROM cre_credentials where cre_username = `;


/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
*/
exports.handler = async function(event) {
    const log = new Logger("user-session-get", event.correlationId, event.key);

    let status, body;

    // Read from Authorization header
    let authHeader = event.headers.Authorization || event.headers.authorization

    if (!authHeader) {
        return response(log, 400, exceptionJSON("LOG-01", "Http header (authorization) not provided"))
    }

    // Extract username and password
    // Authorization looks like  "Basic Y2hhcmxlczoxMjM0NQ==". The second part is in base64(user:pwd)
    let tokenizedAuth = authHeader.split(' ');
    if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Basic") {
        return response(log, 400, exceptionJSON("LOG-02", "Value of Http header (authorization) is not Basic Authorization"))
    }

    // Decode string user:pwd
    let buf = Buffer.from(tokenizedAuth[1], 'base64');
    let usrPwd = buf.toString();

    let usrPwdArray = usrPwd.split(':'); // split on a ':'
    if (usrPwdArray.length !== 2) {
        return response(log, 400, exceptionJSON("LOG-03", "Invalid username:password in 'authorization' header"))
    }

    let username = usrPwdArray[0];
    let password = usrPwdArray[1];

    // Check to avoid SQL injection
    if (username.split(' ').length > 1) {
        return response(log, 400, exceptionJSON("LOG-03", "Invalid username:password in 'authorization' header"))
    }

    log.info(`Login requested by: ${username}`);

    const sqlSelectCredentials = sql + `'${username}'`;

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlSelectCredentials, correlationId: event.correlationId, key: event.key })
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
            return response(log, 500, exceptionJSON("LOG-04", body))
        }

        // Calculate hashed password and compare to the returned one
        if (body != null && body.length == 1 && body[0].cre_hashed_pwd === encryptPwd(body[0].cre_salt, password)) {
            if (body[0].state === 0) {
                // User is active
                log.info(`User ${username} logged in`);
                const tokenExpiration = 1800000
                const token = jwt.sign({ username }, process.env.TOKEN_SECRET, { expiresIn: tokenExpiration });

                return response(log, 200, { id: token, isAdmin: body[0].isAdmin == 1, expiration: tokenExpiration })
            } else {
                // User activation is not completed
                return response(log, 401, exceptionJSON("AUT-02", `User ${username} is not activated`));
            }
        } else {
            // Unauthorized
            return response(log, 401, exceptionJSON("AUT-01", `User ${username} not found or wrong password`));
        }
    } catch (err) {
        log.error(`Error: ${err}`);
        return response(log, 500, exceptionJSON("LOG-05", err.message || err.exception))
    }

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

function encryptPwd(salt, pwd) {
    // Calculate hashed password 
    let saltePwd = pwd + salt;
    let hash = crypto.createHmac('sha512', salt);
    hash.update(saltePwd);
    return hash.digest('hex');
}