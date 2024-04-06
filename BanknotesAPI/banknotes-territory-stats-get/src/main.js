"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const jwt = require('jsonwebtoken');

const lambdaClient = new LambdaClient();

const sqlCatalog = `SELECT "id", "name", sum("numCurrencies") AS "numCurrencies",
            sum("numSeries") AS "numSeries", sum("numDenominations") AS "numDenominations", 
            sum("numNotes") AS "numNotes", sum("numVariants") AS "numVariants",
            sum("numVariants") AS "numVariants"
            FROM (
                SELECT TER.ter_id AS id, TER.ter_name AS name, 
                    count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                    count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                    count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"
                FROM ter_territory TER
                        LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'OWNED'
                        LEFT JOIN iss_issuer ISS ON ISS.iss_ter_id = TEC.tec_ter_id
                        LEFT JOIN ser_series SER ON ISS.iss_id = SER.ser_iss_id AND SER.ser_cur_id = TEC.tec_cur_id
                        LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                        LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                GROUP BY TER.ter_id
                UNION
                SELECT TER.ter_id AS id, TER.ter_name AS name, 
                        count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                        count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                        count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"
                FROM ter_territory TER
                        LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'SHARED'
                        LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                        INNER JOIN iss_issuer ISS ON (ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = TEC.tec_ter_id)
                        LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                        LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                GROUP BY TER.ter_id
            ) as stats
            GROUP BY "id", "name"
            ORDER BY "id"
            `;

const PARAM_USER = "$USER"
const sqlCollection = `SELECT "id", "name", sum("numCurrencies") AS "numCurrencies",
            sum("numSeries") AS "numSeries", sum("numDenominations") AS "numDenominations", 
            sum("numNotes") AS "numNotes", sum("numVariants") AS "numVariants",
            sum("numVariants") AS "numVariants", sum("price") AS "price"
            FROM (
            SELECT TER.ter_id AS id, TER.ter_name AS name, 
                count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants",
                sum(BIT.bit_price * BIT.bit_quantity) AS "price"
            FROM ter_territory TER
                    LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'OWNED'
                    LEFT JOIN iss_issuer ISS ON ISS.iss_ter_id = TEC.tec_ter_id
                    LEFT JOIN ser_series SER ON ISS.iss_id = SER.ser_iss_id AND SER.ser_cur_id = TEC.tec_cur_id
                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                    INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = '${PARAM_USER}'
            GROUP BY TER.ter_id
            UNION
            SELECT TER.ter_id AS id, TER.ter_name AS name, 
                    count(DISTINCT TEC.tec_cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                    count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                    count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants",
                    sum(BIT.bit_price * BIT.bit_quantity) AS "price"
            FROM ter_territory TER
                    LEFT JOIN tec_territory_currency TEC ON TEC.tec_ter_id = TER.ter_id AND TEC.tec_cur_type = 'SHARED'
                    LEFT JOIN ser_series SER ON SER.ser_cur_id = TEC.tec_cur_id
                    INNER JOIN iss_issuer ISS ON (ISS.iss_id = SER.ser_iss_id AND ISS.iss_ter_id = TEC.tec_ter_id)
                    LEFT JOIN ban_banknote BAN ON BAN.ban_ser_id = SER.ser_id
                    LEFT JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id
                    INNER JOIN bit_item BIT ON bit_bva_id = bva_id
                    INNER JOIN usr_user USR ON USR.usr_id = bit_usr_id AND USR.usr_name = '${PARAM_USER}'
            GROUP BY TER.ter_id
            ) as stats
            GROUP BY "id", "name"
            ORDER BY "id"
            `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
*/
exports.handler = async function(event) {
    const log = new Logger("Territory-Stats-Get", event.correlationId, event.key);

    // Read from Authorization header
    let username;
    if (event.headers) {
        let authHeader = event.headers.Authorization || event.headers.authorization;
        if (authHeader) {
            // Extract token
            // Authorization looks like  "Bearer Y2hhcmxlcz"
            let tokenizedAuth = authHeader.split(' ');
            if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Bearer") {
                return response(log, 400, exceptionJSON(log, "ERR-02", "Value of Http header (authorization) is not a Bearer token"));
            }

            let token = tokenizedAuth[1];

            try {
                username = jwt.verify(token, process.env.TOKEN_SECRET).username;
                log.info(`User ${username} authenticated`);
            } catch (exception) {
                log.error(`Error: ${JSON.stringify(exception)}`);
                return response(log, 401, exceptionJSON(log, "ERR-11", exception.message));
            }

            log.info(`Request received. Query String: ${JSON.stringify(event.queryStrParams)} `);

            // Validate username
            if (event.queryStrParams != undefined) {
                // Check username against received value in token
                if (username != event.queryStrParams.user)
                    return response(log, 403, exceptionJSON(log, "ERR-13", "User does not match"));
            } else
                return response(log, 400, exceptionJSON(log, "ERR-01", "Missing parameter in query string"));
        }
    }

    // Use SQL to retrieve collection stats
    let querySQL
    if (username != undefined)
        querySQL = sqlCollection.replaceAll(PARAM_USER, username)
    else
        querySQL = sqlCatalog

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: querySQL, correlationId: event.correlationId, key: event.key })
    };

    let status, body;
    try {
        const command = new InvokeCommand(commandParams);

        log.info(`Request sent: ${JSON.stringify(commandParams)}`);

        // Call data provider
        const response = await lambdaClient.send(command);
        const respStr = new TextDecoder().decode(response.Payload);

        log.info(`Response received: ${respStr}`);

        const respJSON = JSON.parse(respStr);

        status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
        body = respJSON.body;
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    const responseJSON = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(responseJSON)}`);
    return responseJSON;
};

function exceptionJSON(log, code, description) {
    log.error(`Error: ${description}`);
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