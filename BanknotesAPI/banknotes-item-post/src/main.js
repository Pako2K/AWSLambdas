"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const PARAM_USER = "$USER"
const PARAM_VARIANT_ID = "$VARIANT_ID"
const sqlSelectItem = `SELECT  BVA.bva_cat_id AS "catalogId",
                CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                CUR.cur_id AS "currencyId", CUR.cur_name AS "currencyName",
                TER.ter_id AS "territoryId", TER.ter_name AS "territoryName",
                CON.con_id AS "continentId", CON.con_name AS "continentName",
                BIT.bit_id AS "id", BIT.bit_bva_id AS "variantId", BIT.bit_gra_grade AS "grade", BIT.bit_price AS "price", 
                BIT.bit_quantity AS "quantity", BIT.bit_seller AS "seller", BIT.bit_purchase_date AS "purchaseDate",
                BIT.bit_description AS "description"
                FROM bit_item BIT
                INNER JOIN (
                    SELECT max(bit_id) AS itemId
                    FROM bit_item b
                    INNER JOIN usr_user u ON b.bit_usr_id = u.usr_id AND bit_bva_id = ${PARAM_VARIANT_ID} AND u.usr_name = '${PARAM_USER}') b ON BIT.bit_id = b.itemId
                INNER JOIN bva_variant BVA ON BVA.bva_id = BIT.bit_bva_id
                INNER JOIN gra_grade GRA ON GRA.gra_grade = BIT.bit_gra_grade
                INNER JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                LEFT JOIN cus_currency_unit CUS ON BAN.ban_cus_id = CUS.cus_id
                INNER JOIN ser_series SER ON SER.ser_id = BAN.ban_ser_id
                INNER JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                INNER JOIN cur_currency CUR ON CUR.cur_id = SER.ser_cur_id
                INNER JOIN ter_territory TER ON TER.ter_id = ISS.iss_ter_id
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id
                   `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - headers       : with Authorization
    - body          : payload
*/
exports.handler = async function(event) {
    const log = new Logger("Item-Post", event.correlationId, event.key);

    if (!event.queryStrParams && !event.queryStrParams.user)
        return response(log, 400, exceptionJSON("ERR-01", "Missing parameter in query string"));

    let username = event.queryStrParams.user;

    // Build query string 
    if (event.body.seller) event.body.seller = `'${event.body.seller.replaceAll("'", '"')}'`
    else event.body.seller = "NULL"
    if (event.body.purchaseDate) event.body.purchaseDate = `'${event.body.purchaseDate}'`
    else event.body.purchaseDate = "NULL"
    if (event.body.description) event.body.description = `'${event.body.description.replaceAll("'", '"')}'`
    else event.body.description = "NULL"
    let sqlInsertItem = `INSERT INTO bit_item (bit_usr_id, bit_bva_id, bit_quantity, bit_gra_grade, bit_price, bit_seller, bit_purchase_date, bit_description)
    SELECT usr.usr_id, ${event.body.variantId} AS bva_id, ${event.body.quantity} AS quantity, '${event.body.grade}' AS grade, 
            ${event.body.price} AS price, ${event.body.seller} AS seller, ${event.body.purchaseDate} AS date, ${event.body.description} AS desc
    FROM usr_user usr
    WHERE usr_name = '${username}'`;

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlInsertItem, correlationId: event.correlationId, key: event.key })
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
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    // Mapping
    if (status == 200) {
        // Get the new item id
        let querySQL2 = sqlSelectItem.replace(PARAM_USER, username).replace(PARAM_VARIANT_ID, event.body.variantId)

        const commandParams = {
            FunctionName: "banknotes-db",
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({ sql: querySQL2, correlationId: event.correlationId, key: event.key })
        };

        try {
            const command = new InvokeCommand(commandParams);

            log.info(`Select Request sent: ${JSON.stringify(commandParams)}`);

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

        if (status == 200) {
            if (body == null || body == []) {
                log.error(`Error: empty reponse!`);
                status = 500;
                body = exceptionJSON(5001, "Inserted item not found!");
            } else {
                let row = body[0]
                body = {
                    item: { id: row.id, variantId: row.variantId, grade: row.grade, quantity: row.quantity, price: row.price, seller: row.seller, purchaseDate: row.purchaseDate, description: row.description },
                    continent: { id: row.continentId, name: row.continentName },
                    territory: { id: row.territoryId, name: row.territoryName },
                    currency: { id: row.currencyId, name: row.currencyName },
                    denomination: row.denomination,
                    catalogId: row.catalogId
                }
            }
        }
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