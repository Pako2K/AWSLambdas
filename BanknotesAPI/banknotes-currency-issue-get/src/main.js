"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const CURRENCY_ID_PARAM = "CURRRENCY_ID"
const sql = `SELECT SER.*, BAN.*, VAR.*
                FROM SER_SERIES SER
                LEFT JOIN BAN_BANKNOTE BAN ON BAN.ban_ser_id = SER.ser_id
                LEFT JOIN BVA_VARIANT VAR ON VAR.bva_ban_id = BAN.ban_id
                WHERE SER.ser_cur_id = ${CURRENCY_ID_PARAM}
                ORDER BY ser_start, ser_end, ser_name, ban_cus_id desc, ban_face_value, bva_cat_id
            `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - queryStrParams: optional query string parameters
    - path          : URL path
*/
exports.handler = async function(event) {
    const log = new Logger("Currency-Issue-Get", event.correlationId, event.key);

    log.info(`Request received. Path: ${JSON.stringify(event.path)} `);

    const currency_id = event.path.split("/")[2];

    if (parseInt(currency_id) == NaN) {
        const response = {
            statusCode: 400,
            body: "Invalid currency id"
        };
        log.error(`Invalid currency id: ${currency_id}`);
        return response;
    }


    let finalSql = sql.replace(CURRENCY_ID_PARAM, currency_id);

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
        if (body.length > 0) {
            let ser = mapNewSeries(body[0]);
            respBody.push(ser);
        }

        let prevRecord = body[0];
        for (let i = 1; i < body.length; i++) {
            let record = body[i];
            if (record.ser_id == prevRecord.ser_id) {
                updateSeries(respBody[respBody.length - 1], prevRecord, record);
            } else {
                let ser = mapNewSeries(record);
                respBody.push(ser);
            }

            prevRecord = record;
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



function mapNewSeries(item) {
    let record = {};

    record.id = item.ser_id;
    record.name = item.ser_name;
    record.start = item.ser_start;
    if (item.ser_end)
        record.end = item.ser_end;
    record.issuerId = item.ser_iss_id;
    if (item.ser_law_date)
        record.law = item.ser_law_date;
    if (item.ser_description)
        record.description = item.ser_description;
    record.isOverstamped = item.ser_is_overstamped ? true : false;

    record.banknotes = [];
    if (item.ban_id)
        record.banknotes.push(mapNewBanknote(item));

    return record;
}

function updateSeries(currentRecord, prevItem, item) {
    if (item.ban_id == prevItem.ban_id) {
        // Update banknote
        currentRecord.banknotes[currentRecord.banknotes.length - 1].variants.push(mapVariant(item));
    } else {
        // New banknote
        currentRecord.banknotes.push(mapNewBanknote(item));
    }
}

function mapNewBanknote(item) {
    let banknote = {};
    banknote.id = item.ban_id;
    banknote.faceValue = item.ban_face_value;
    banknote.unitId = item.ban_cus_id;
    if (item.ban_mat_id) banknote.materialId = item.ban_mat_id;
    if (item.ban_size_width) banknote.width = item.ban_size_width;
    if (item.ban_size_height) banknote.height = item.ban_size_height;
    //banknotes.isVertical = item.ban_isVertical;
    if (item.ban_obverse_desc) banknote.obverseDesc = item.ban_obverse_desc;
    if (item.ban_reverse_desc) banknote.reverseDesc = item.ban_reverse_desc;
    if (item.ban_description) banknote.description = item.ban_description;
    banknote.variants = [];

    if (item.bva_id) {
        banknote.variants.push(mapVariant(item));
    }

    return banknote;
}

function mapVariant(item) {
    let variant = {};
    variant.id = item.bva_id;
    variant.catalogId = item.bva_cat_id;
    variant.issueYear = item.bva_issue_year;
    if (item.bva_printed_date) variant.printedDate = item.bva_printed_date;
    if (item.bva_overstamped_id) variant.overstampedId = item.bva_overstamped_id;
    if (item.bva_pri_id) variant.printerId = item.bva_pri_id;
    if (item.bva_signature) variant.signature = item.bva_signature;
    if (item.bva_signature_ext) variant.signatureDesc = item.bva_signature_ext;
    if (item.bva_watermark) variant.watermark = item.bva_watermark;
    if (item.bva_security_thread) variant.securityThread = item.bva_security_thread;
    if (item.bva_added_security) variant.addedSecurity = item.bva_added_security;
    if (item.bva_obverse_color) variant.obverseColor = item.bva_obverse_color;
    if (item.bva_reverse_color) variant.reverseColor = item.bva_reverse_color;
    if (item.bva_description) variant.description = item.bva_description;
    variant.notIssued = item.bva_not_issued ? true : false;
    variant.isSpecimen = item.bva_is_specimen ? true : false;
    variant.isCommemorative = item.bva_is_commemorative ? true : false;
    variant.isNumisProduct = item.bva_is_numis_product ? true : false;
    variant.isReplacement = item.bva_is_replacement ? true : false;
    variant.isError = item.bva_is_error ? true : false;

    return variant;
}