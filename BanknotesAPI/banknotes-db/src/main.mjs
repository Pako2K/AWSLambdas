import pg from 'pg';
import fs from 'fs';

import Logger from 'logger';

const Client = pg.Client;

const DB_CONFIG = JSON.parse(fs.readFileSync('./dbconfig.json'));

const dbConnection = await initialize();

/* 
    Expected event:
    - sql           : sql string to be executed
    - correlationId : for logging
    - key           : main id in message, for logging
*/
export const handler = async(event) => {
    const log = new Logger("Banknotes DB", event.correlationId, event.key);

    log.info(`Request received: ${JSON.stringify(event.sql)}`);

    let status, body;

    try {
        const result = await dbConnection.query(event.sql);
        status = 200;
        body = result.rows;
    } catch (err) {
        log.error(`SQL Error in:\n ${event.sql}\n${JSON.stringify(err)}`);
        status = 500;
        body = { exception: exception(5003, err.message) };
    }

    const response = {
        statusCode: status,
        body: body
    };
    log.info(`Response sent: ${JSON.stringify(response)}`);
    return response;
};


async function initialize() {
    const log = new Logger("Banknotes DB (initialization)", "#");

    // Read configuration from environment
    const catDBPwd = process.env.CAT_DB_PWD;
    if (catDBPwd == undefined) {
        const msg = "Password not found in the environment, CAT_DB_PWD"
        log.error(msg)
        throw exception(5001, msg);
    }

    try {
        // Update password
        DB_CONFIG.password = catDBPwd;

        // Connect to the DB
        log.info('Trying to open connection to DB: ' + DB_CONFIG.database);

        const client = new Client(DB_CONFIG);
        await client.connect();

        log.info('Connected to DB');
        return client;
    } catch (err) {
        log.error("Error while connecting to DB: " + err);
        throw exception(5002, err);
    }
}


function exception(code, msg) {
    return {
        code: code,
        message: msg
    };
}