"use strict"

const { LambdaClient, InvokeCommand } = require(process.env.CLIENT_LAMBDA_MOCK || "@aws-sdk/client-lambda");

const { Logger } = require('logger');

const lambdaClient = new LambdaClient();

const sql = `SELECT TER.ter_id as id, TER.ter_name as name, TER.ter_con_id as "continentId", CON.con_name as "continentName", 
                TER.ter_tty_id as "territoryTypeId", TTY.tty_name as "territoryTypeName", TER.ter_iso2 as iso2, 
                TER.ter_iso3 as iso3, TER.ter_official_name as "officialName", TER.ter_start as start, TER.ter_end as end,
                TER.ter_parent_country_id as "parentId", TER.ter_successor_id as successors, TER.ter_description as description
            FROM ter_territory TER, con_continent CON, tty_territory_type TTY
            WHERE CON.con_id = TER.ter_con_id AND TTY.tty_id = TER.ter_tty_id
            `;
const sqlIssuer = `SELECT ISS.iss_id as id, ISS.iss_ter_id as "territoryId", ISS.iss_name as "issuerName", ISS.iss_description as "issuerDescription"
                    FROM ISS_ISSUER ISS
                    ORDER BY "territoryId"
                    `;

/* 
    Expected event:
    - correlationId : for logging
    - key           : main id in message, for logging
    - domainName    : URL domain name
    - queryStrParams: optional query string parameters
*/
exports.handler = async function(event) {
    const log = new Logger("Territory-Get", event.correlationId, event.key);

    log.info(`Request received. Query String: ${JSON.stringify(event.queryStrParams)} `);

    let finalSql;
    if (event.queryStrParams != undefined && event.queryStrParams.id != undefined)
        finalSql = sql + ` WHERE ter_id = ${event.queryStrParams.id}`;
    else
        finalSql = sql + ` ORDER BY ter_name`;

    const commandParams = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: finalSql, correlationId: event.correlationId, key: event.key })
    };

    const commandParamsIssuer = {
        FunctionName: "banknotes-db",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ sql: sqlIssuer, correlationId: event.correlationId, key: event.key })
    };

    let status, body, bodyIssuer;
    try {
        const command = new InvokeCommand(commandParams);
        log.info(`Request sent: ${JSON.stringify(commandParams)}`);
        // Call data provider
        const response = await lambdaClient.send(command);
        const respStr = new TextDecoder().decode(response.Payload);

        log.info(`Response received: ${respStr}`);
        const respJSON = JSON.parse(respStr);
        body = respJSON.body;

        if (respJSON.statusCode = 200) {
            const commandIssuer = new InvokeCommand(commandParamsIssuer);
            log.info(`Request sent: ${JSON.stringify(commandParamsIssuer)}`);
            // Call data provider
            const responseIssuer = await lambdaClient.send(commandIssuer);
            const respStrIssuer = new TextDecoder().decode(responseIssuer.Payload);

            log.info(`Response received: ${respStrIssuer}`);
            const respJSONIssuer = JSON.parse(respStrIssuer);
            status = respJSONIssuer.statusCode == undefined ? 500 : respJSONIssuer.statusCode;
            bodyIssuer = respJSONIssuer.body
        } else
            status = respJSON.statusCode == undefined ? 500 : respJSON.statusCode;
    } catch (err) {
        log.error(`Error: ${err}`);
        status = 500;
        body = JSON.stringify({ exception: err.message || err.exception });
    }

    // Add URI, merge Issuer and remove optional fields
    if (status == 200) {
        if (!body) body = [];
        if (!bodyIssuer) bodyIssuer = []
        if (!Array.isArray(body)) body = [body];
        if (!Array.isArray(bodyIssuer)) bodyIssuer = [bodyIssuer];

        for (let territory of body) {
            territory.uri = `https://${event.domainName}/territory?id=${territory.id}`;
            territory.continent = { "id": territory.continentId, "name": territory.continentName };
            delete territory.continentId;
            delete territory.continentName;
            territory.territoryType = { "id": territory.territoryTypeId, "name": territory.territoryTypeName };
            delete territory.territoryTypeId;
            delete territory.territoryTypeName;
            if (territory.iso3 == null) delete territory.iso3;
            if (territory.iso2 == null) delete territory.iso2;
            if (territory.end == null) delete territory.end;
            if (territory.parentId == null) delete territory.parentId;
            if (territory.successors == null) delete territory.successors;
            else {
                let successors = territory.successors.split(',');
                let sucArray = [];
                for (let id of successors)
                    sucArray.push({ "id": parseInt(id) });
                territory.successors = sucArray;
            }
            territory.issuers = []
            for (let iss of bodyIssuer) {
                if (iss.territoryId == territory.id) {
                    let issuer = {};
                    issuer.id = iss.id;
                    issuer.name = iss.issuerName;
                    if (iss.issuerDescription) issuer.description = iss.issuerDescription
                    territory.issuers.push(issuer);
                }
            }
            if (territory.issuers.length == 0) delete territory.issuers

            if (territory.description == null) delete territory.description;
        }
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};