"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const jwt = require('jsonwebtoken');

const lambdaClient = new LambdaClient();

const PARAM_USER = "$USER"
const sql = `SELECT  BVA.bva_cat_id AS "catalogId",
                CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                CUR.cur_id AS "currencyId", CUR.cur_name AS "currencyName",
                TER.ter_id AS "territoryId", TER.ter_name AS "territoryName",
                CON.con_id AS "continentId", CON.con_name AS "continentName",
                BIT.bit_id AS "id", BIT.bit_bva_id AS "variantId", BIT.bit_gra_grade AS "grade", BIT.bit_price AS "price", 
                BIT.bit_quantity AS "quantity", BIT.bit_seller AS "seller", BIT.bit_purchase_date AS "purchaseDate",
                BIT.bit_description AS "description"
                FROM bit_item BIT
                INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = '${PARAM_USER}'
                INNER JOIN bva_variant BVA ON BVA.bva_id = BIT.bit_bva_id
                INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade
                INNER JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                LEFT JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                INNER JOIN ser_series SER ON SER.ser_id = BAN.ban_ser_id
                INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                INNER JOIN cur_currency CUR ON CUR.cur_id = SER.ser_cur_id
                INNER JOIN ter_territory TER ON TER.ter_id = ISS.iss_ter_id
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id
                ORDER BY "variantId" ASC, GRA.gra_value ASC, "price" DESC
            `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
*/
exports.handler = async function(event) {
    const log = new Logger("Item-Get", event.correlationId, event.key);

    // Read from Authorization header
    let authHeader = event.headers.Authorization || event.headers.authorization;

    if (!authHeader) {
        return response(log, 400, exceptionJSON("ERR-01", "Http header (authorization) not provided"));
    }

    // Extract token
    // Authorization looks like  "Bearer Y2hhcmxlcz"
    let tokenizedAuth = authHeader.split(' ');
    if (tokenizedAuth.length !== 2 || tokenizedAuth[0] !== "Bearer") {
        return response(log, 400, exceptionJSON("ERR-02", "Value of Http header (authorization) is not a Bearer token"));
    }

    let token = tokenizedAuth[1];

    let username;
    try {
        username = jwt.verify(token, process.env.TOKEN_SECRET).username;
        log.info(`User ${username} authenticated`);
    } catch (exception) {
        log.error(`Error: ${JSON.stringify(exception)}`);
        return response(log, 401, exceptionJSON("ERR-11", exception.message));
    }

    // Build query string preventing sql injection
    let querySQL = sql.replace(PARAM_USER, username)

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

    // Mapping
    let respBody = []
    if (status == 200) {
        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        let respBody = []
        for (let row of body) {
            respBody.push({
                item: { id: row.id, variantId: row.variantId, grade: row.grade, quantity: row.quantity, price: row.price, seller: row.seller, purchaseDate: row.purchaseDate, description: row.description },
                continent: { id: row.continentId, name: row.continentName },
                territory: { id: row.territoryId, name: row.territoryName },
                currency: { id: row.currencyId, name: row.currencyName },
                denomination: row.denomination,
                catalogId: row.catalogId
            })
        }
        body = respBody
    }

    return response(log, status, body);
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