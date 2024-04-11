"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sql = `SELECT CUR.*, TEC.*, CUS.*, TER.ter_name, TER.ter_con_id, CON.con_name
            FROM cur_currency CUR
            INNER JOIN tec_territory_currency TEC ON TEC.tec_cur_id = CUR.cur_id 
            INNER JOIN ter_territory TER ON TEC.tec_ter_id = TER.ter_id
            INNER JOIN con_continent CON ON TER.ter_con_id = CON.con_id
            LEFT JOIN cus_currency_unit CUS ON CUR.cur_id = CUS.cus_cur_id
            `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - queryStrParams: optional query string parameters
*/
exports.handler = async function(event) {
    const log = new Logger("Currency-Get", event.correlationId, event.key);

    log.info(`Request received. Query String: ${JSON.stringify(event.queryStrParams)} `);

    let finalSql;
    if (event.queryStrParams != undefined && event.queryStrParams.id != undefined)
        finalSql = sql + ` WHERE CUR.cur_id = ${event.queryStrParams.id}`;
    else
        finalSql = sql + ` ORDER BY CUR.cur_id, TEC.tec_ter_id`;

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
        body = respJSON.body == undefined ? respStr : respJSON.body;
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    // Map fields
    if (status == 200) {
        // All this logic to aggregate the DB records into a JSON!!

        if (body == null) body = [];
        if (!Array.isArray(body)) body = [body];

        let respBody = [];
        // Insert first element
        if (body.length >= 1) {
            let cur = mapNewCurrency(body[0]);
            cur.uri = `https://${event.domainName}/currency?id=${body[0].cur_id}`;
            respBody.push(cur);
        }

        let prevRecord = body[0];
        for (let i = 1; i < body.length; i++) {
            let record = body[i];
            if (record.cur_id == prevRecord.cur_id) {
                updateCurrency(respBody[respBody.length - 1], prevRecord, record);
            } else {
                let cur = mapNewCurrency(record);
                cur.uri = `https://${event.domainName}/currency?id=${record.cur_id}`;
                respBody.push(cur);
            }

            prevRecord = record;
        }
        body = respBody.sort(function(a, b) {
            let x = a.name.toLowerCase();
            let y = b.name.toLowerCase();
            if (x < y) return -1;
            if (x > y) return 1;
            return 0;
        })
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};



function mapNewCurrency(item) {
    let record = {};

    record.id = item.cur_id;
    if (item.tec_iso3 != null)
        record.iso3 = item.tec_iso3;
    record.name = item.cur_name;
    record.continent = {}
    record.continent.id = item.ter_con_id;
    record.continent.name = item.con_name;
    if (item.cur_name_plural != null)
        record.namePlural = item.cur_name_plural;
    record.fullName = item.cur_full_name;
    if (item.cur_symbol != null)
        record.symbol = item.cur_symbol;
    record.start = item.cur_start;
    if (item.cur_end != null)
        record.end = item.cur_end;

    addTerritory(record, item);

    if (item.cur_successor != null) {
        record.successor = { id: item.cur_successor }
        if (item.cur_replacement_rate != null)
            record.successor.rate = item.cur_replacement_rate;
    }

    if (item.cus_id != null) {
        record.units = [mapCurrencyUnit(item)];
    }
    if (item.cur_description != null)
        record.description = item.cur_description;

    return record;
}

function updateCurrency(currentRecord, prevItem, item) {
    if (item.tec_ter_id == prevItem.tec_ter_id && item.tec_start == prevItem.tec_start) {
        // New currency unit
        currentRecord.units.push(mapCurrencyUnit(item));
    } else {
        // New country
        addTerritory(currentRecord, item);
    }
}

function mapCurrencyUnit(item) {
    let unit = {
        id: item.cus_id,
        name: item.cus_name,
        namePlural: item.cus_name_plural,
        value: item.cus_value
    };

    if (item.cus_abbreviation != null)
        unit.abbreviation = item.cus_abbreviation;

    return unit;
}

function addTerritory(currentRecord, item) {
    switch (item.tec_cur_type) {
        case "OWNED":
            currentRecord.ownedBy = setRelatedTerritory(currentRecord.ownedBy, item);
            break;
        case "SHARED":
            currentRecord.sharedBy = setRelatedTerritory(currentRecord.sharedBy, item);
            break;
        case "FOREIGN":
            currentRecord.usedBy = setRelatedTerritory(currentRecord.usedBy, item);
            break;
    }
}

function setRelatedTerritory(target, item) {
    let relation = {};
    relation.territory = {};
    relation.territory.id = item.tec_ter_id
    relation.territory.name = item.ter_name
    if (item.tec_start == null) {
        relation.start = item.cur_start;
        if (item.cur_end != null)
            relation.end = item.cur_end;
    } else {
        relation.start = item.tec_start;
        if (item.tec_end != null)
            relation.end = item.tec_end;
    }
    if (target == null)
        return [relation];
    else {
        target.push(relation);
        return target;
    }
}