"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sqlCatalog = ` SELECT  BVA.bva_issue_year AS "issueYear", 
                            CON.con_id AS "continentId", CON.con_name AS "continentName",
                            count(DISTINCT TER.ter_id) AS "numTerritories", 
                            count(DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                            count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                            count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"
                        FROM bva_variant BVA
                            LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                            LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                            LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                            LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ISS.iss_ter_id)
                            LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id 
                            INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id 
                        GROUP BY "issueYear", "continentId"
`;

const PARAM_USER = "$USER"
const sqlCollection = ` SELECT  BVA.bva_issue_year AS "issueYear", 
                            CON.con_id AS "continentId", CON.con_name AS "continentName",
                            count(DISTINCT TER.ter_id) AS "numTerritories", 
                            count(DISTINCT CUR.cur_id) AS "numCurrencies", count (DISTINCT SER.ser_id) AS "numSeries", 
                            count(DISTINCT(BAN.ban_face_value * 10000 + BAN.ban_cus_id)) AS "numDenominations", 
                            count(DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants",
                            sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                        FROM bva_variant BVA
                            LEFT JOIN ban_banknote BAN ON BAN.ban_id = BVA.bva_ban_id
                            LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id
                            LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id
                            LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ISS.iss_ter_id)
                            LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id 
                            INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id 
                            INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                            INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = '${PARAM_USER}'
                        GROUP BY "issueYear", "continentId"
`;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
*/
exports.handler = async function(event) {
    const log = new Logger("Issue-Year-Stats-Get", event.correlationId, event.key);

    log.info(`Request received. Query String: ${JSON.stringify(event.queryStrParams)} `);

    let username;
    if (event.queryStrParams)
        username = event.queryStrParams.user

    // Use SQL to retrieve collection stats
    let querySQL;
    if (username)
        querySQL = sqlCollection.replaceAll(PARAM_USER, username);
    else
        querySQL = sqlCatalog;

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

    // Map to response JSON
    if (status == 200) {
        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        let respBody = [];
        let newRecord = {};
        newRecord.issueYear = null
        newRecord.continentStats = [];
        for (let rec of body) {
            if (newRecord.issueYear != null && rec.issueYear != newRecord.issueYear) {
                // Add previous record
                respBody.push(newRecord);
                newRecord = {};
                newRecord.issueYear = rec.issueYear
                newRecord.continentStats = [];
            }
            newRecord.issueYear = rec.issueYear
            let stats = {};
            stats.id = rec.continentId;
            stats.numTerritories = parseInt(rec.numTerritories);
            stats.numCurrencies = parseInt(rec.numCurrencies);
            stats.numSeries = parseInt(rec.numSeries);
            stats.numDenominations = parseInt(rec.numDenominations);
            stats.numNotes = parseInt(rec.numNotes);
            stats.numVariants = parseInt(rec.numVariants);
            if (rec.price)
                stats.price = parseFloat(rec.price);
            newRecord.continentStats.push(stats);
        }
        respBody.push(newRecord);
        body = respBody
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};