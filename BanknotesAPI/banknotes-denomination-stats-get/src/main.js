"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const YEAR_FILTER_JOIN = "$YEAR_FILTER_JOIN"
const YEAR_FILTER = "$YEAR_FILTER"
const sqlCatalog = `SELECT CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                CASE WHEN count(CASE WHEN CUR.cur_end is NULL THEN 1 ELSE NULL END) = 0 THEN false ELSE true END as "isCurrent",
                CON.con_id AS "continentId", CON.con_name AS "continentName",
                count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
                count (DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants"
                FROM ban_banknote BAN           
                LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id 
                LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id 
                LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ISS.iss_ter_id)
                LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
                LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id 
                INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id
                ${YEAR_FILTER_JOIN} JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${YEAR_FILTER}
                GROUP BY "denomination", "continentId"
                `;

const PARAM_USER = "$USER"
const sqlCollection = `SELECT CASE WHEN BAN.ban_cus_id = 0 THEN BAN.ban_face_value ELSE BAN.ban_face_value / CUS.cus_value END AS "denomination",
                            CASE WHEN count(CASE WHEN CUR.cur_end is NULL THEN 1 ELSE NULL END) = 0 THEN false ELSE true END as "isCurrent",
                            CON.con_id AS "continentId", CON.con_name AS "continentName",
                            count (DISTINCT TER.ter_id) AS "numTerritories", count (DISTINCT CUR.cur_id) AS "numCurrencies",
                            count (DISTINCT BAN.ban_id) AS "numNotes", count(DISTINCT BVA.bva_id) AS "numVariants", 
                            sum(BIT.bit_price * BIT.bit_quantity) AS "price"
                        FROM ban_banknote BAN           
                            LEFT JOIN ser_series SER ON BAN.ban_ser_id = SER.ser_id
                            LEFT JOIN iss_issuer ISS ON ISS.iss_id = SER.ser_iss_id 
                            LEFT JOIN cur_currency CUR ON SER.ser_cur_id = CUR.cur_id 
                            LEFT JOIN tec_territory_currency TEC ON (TEC.tec_cur_id = CUR.cur_id AND TEC.tec_ter_id = ISS.iss_ter_id)
                            LEFT JOIN cus_currency_unit CUS ON CUS.cus_id = BAN.ban_cus_id
                            LEFT JOIN ter_territory TER ON TER.ter_id = TEC.tec_ter_id 
                            INNER JOIN con_continent CON ON CON.con_id = TER.ter_con_id
                            INNER JOIN bva_variant BVA ON BVA.bva_ban_id = BAN.ban_id ${YEAR_FILTER}
                            INNER JOIN bit_item BIT ON BIT.bit_bva_id = BVA.bva_id
                            INNER JOIN usr_user USR ON USR.usr_id = BIT.bit_usr_id AND USR.usr_name = '${PARAM_USER}'
                        GROUP BY "denomination", "continentId"
`;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
*/
exports.handler = async function(event) {
    const log = new Logger("Denomination-Stats-Get", event.correlationId, event.key);

    log.info(`Request received. Query String: ${JSON.stringify(event.queryStrParams)} `);

    let username;
    if (event.queryStrParams)
        username = event.queryStrParams.user

    // Check parameters
    let yearFilter = "";
    if (event.queryStrParams != undefined) {
        let yearFrom = parseInt(event.queryStrParams.fromYear);
        if (!isNaN(yearFrom))
            yearFilter = `AND BVA.bva_issue_year >= ${yearFrom}`;
        let yearTo = parseInt(event.queryStrParams.toYear);
        if (!isNaN(yearTo))
            yearFilter += ` AND BVA.bva_issue_year <= ${yearTo}`;
    }

    let finalSql;

    if (username)
        finalSql = sqlCollection.replace(PARAM_USER, username).replace(YEAR_FILTER, yearFilter)
    else
        finalSql = sqlCatalog.replace(YEAR_FILTER_JOIN, yearFilter === "" ? "LEFT" : "INNER").replace(YEAR_FILTER, yearFilter)

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: finalSql, correlationId: event.correlationId, key: event.key })
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
        if (body.length > 0) {
            newRecord.denomination = null;
            newRecord.continentStats = [];
            for (let rec of body) {
                // Format denomination
                let denom = Number.parseFloat(rec.denomination.toPrecision(3))

                if (newRecord.denomination != null && denom != newRecord.denomination) {
                    // Add previous record
                    respBody.push(newRecord);
                    newRecord = {};
                    newRecord.denomination = denom
                    newRecord.continentStats = [];
                }
                newRecord.denomination = denom
                let stats = {};
                stats.id = rec.continentId;
                stats.isCurrent = rec.isCurrent;
                stats.numTerritories = parseInt(rec.numTerritories);
                stats.numCurrencies = parseInt(rec.numCurrencies);
                stats.numNotes = parseInt(rec.numNotes);
                stats.numVariants = parseInt(rec.numVariants);
                if (rec.price)
                    stats.price = parseFloat(rec.price);
                newRecord.continentStats.push(stats);
            }
            respBody.push(newRecord);
        }
        body = respBody
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};