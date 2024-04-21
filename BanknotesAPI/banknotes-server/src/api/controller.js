"use strict";

const yaml = require('yamljs');
const JSONValidator = require('jsonschema').Validator;
const { Logger } = require('logger');
const { route } = require('./router');

const OAS_JSON = setOAS();
const VALIDATOR = setValidator();

const VALIDATE = process.env.TEST == true

exports.execAPI = async function(event) {
    const [operationId, requestSchema, responseSchema] = lookupAPI(event);

    // Excecute operation
    try {
        const result = await route(operationId, event.headers["x-correlation-id"], event.requestContext.domainName, event.headers, event.queryStringParameters, event.requestContext.http.path);
        if (!result.body)
            throw { code: 5002, message: `Internal error. ${JSON.stringify(result)}.` }

        // Validate only during testing (it is very slow for big messages!)
        if (VALIDATE) {
            const validation = VALIDATOR.validate(result.body, responseSchema);
            if (!validation.valid)
                throw { code: 5001, message: `Invalid Response: ${JSON.stringify(result.body)}. Errors: ${validation.errors}` }
        }
        return result;
    } catch (err) {
        const exc = exception(500, err.code, err.message);
        throw exc;
    }
}


function lookupAPI(event) {
    const log = new Logger("Banknotes-Server", event.headers["x-correlation-id"]);

    let method;
    let path;
    if (event.requestContext && event.requestContext.http) {
        method = event.requestContext.http.method.toLowerCase();
        path = event.requestContext.http.path;
    }

    // Tokenized path
    let pathTokens = path.split("/");

    // Match to paths
    let pathMatched;
    for (let oasPath in OAS_JSON.paths) {
        // tokenize oasPath
        let oasPathTokens = oasPath.split("/");
        if (oasPathTokens.length != pathTokens.length) continue;
        let match = true;
        for (let i in pathTokens) {
            if (oasPathTokens[i] == undefined || (!oasPathTokens[i].startsWith("{") && pathTokens[i] != oasPathTokens[i])) {
                match = false;
                break;
            }
        }
        if (match) {
            pathMatched = oasPath;
            break;
        }
    }

    //const pathOAS = OAS_JSON.paths[path];
    if (!pathMatched) throw exception(404, "404", "Resource not found");

    const methodOAS = OAS_JSON.paths[pathMatched][method];
    if (!methodOAS) throw exception(404, "404", "Resource/Operation not found");

    const operationId = methodOAS.operationId
    if (!operationId) throw exception(500, "500", "OAS Operation not defined!");

    let reqSchema = {};
    let repSchema = {};

    try {
        if (method != 'get') reqSchema = methodOAS["requestBody"]["content"]["application/json"]["schema"];
    } catch (err) {
        log.warn("No Request schema found");
    }

    try {
        repSchema = methodOAS["responses"]["200"]["content"]["application/json"]["schema"];
    } catch (err) {
        log.warn("No Response schema found");
    }

    return [operationId, reqSchema, repSchema];
}

function setOAS() {
    const originalOas = yaml.load("./api/banknotes-api.yaml");
    return JSON.parse(JSON.stringify(originalOas).replace(/\$ref":"#/g, '$ref":"'));
}

function setValidator() {
    const validator = new JSONValidator();

    // Load all the schemas
    const allSchemas = OAS_JSON["components"] ? OAS_JSON["components"]["schemas"] : [];
    for (let schemaName of Object.keys(allSchemas))
        validator.addSchema(allSchemas[schemaName], "/components/schemas/" + schemaName);

    return validator;
}


function exception(status, code, msg) {
    return {
        status: status,
        exception: {
            code: code,
            description: msg
        }
    };
}