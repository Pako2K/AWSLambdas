"use strict";

const jwt = require('jsonwebtoken');

const yaml = require('yamljs');
const JSONValidator = require('jsonschema').Validator;
const { Logger } = require('logger');
const { route } = require('./router');

const OAS_JSON = setOAS();
const VALIDATOR = setValidator();

const VALIDATE = process.env.TEST == true

exports.execAPI = async function(event) {
    const log = new Logger("Banknotes-Server", event.headers["x-correlation-id"]);

    const [mustAuthorize, operationId, requestSchema, responseSchema] = lookupAPI(event);

    if (mustAuthorize) {
        // Validate Authorization header
        let username;
        if (event.headers) {
            let authHeader = event.headers.Authorization || event.headers.authorization;
            if (authHeader && authHeader) {
                // Extract token
                // Authorization looks like  "Bearer Y2hhcmxlcz"
                let tokenizedAuth = authHeader.split(' ');
                if (tokenizedAuth.length == 2 && tokenizedAuth[0] == "Bearer") {
                    let token = tokenizedAuth[1];

                    try {
                        username = jwt.verify(token, process.env.TOKEN_SECRET).username;
                        log.info(`User ${username} authenticated`);
                    } catch (exc) {
                        log.error(`Error: ${JSON.stringify(exc)}`);
                        throw exception(401, "ERR-11", exc.message);
                    }

                    // Validate username
                    if (event.queryStringParameters != undefined) {
                        // Check username against received value in token
                        if (username != event.queryStringParameters.user)
                            throw exception(403, "ERR-03", "User does not match");
                    } else
                        throw exception(400, "ERR-01", "Missing parameter in query string");
                } else {
                    throw exception(400, "ERR-02", "Value of Http header (authorization) is not valid");
                }
            } else {
                throw exception(400, "ERR-02", "Value of Http header (authorization) is not valid");
            }
        } else {
            throw exception(400, "ERR-02", "Value of Http header (authorization) is not valid");
        }
    }

    // Validate request
    if (Object.keys(requestSchema).length != 0) {
        if (!event.body)
            throw exception(400, "ERR-04", `Invalid Request Body. It is empty!`)

        try {
            event.body = JSON.parse(event.body)
        } catch (exc) {
            throw exception(400, "ERR-04", `Invalid Request Body (NO VALID JSON): ${event.body}`)
        }
        let validation = VALIDATOR.validate(event.body, requestSchema);
        if (!validation.valid)
            throw exception(400, "ERR-04", `Invalid Request Body: ${event.body}. Errors: ${validation.errors}`)
    }

    // Excecute operation
    try {
        const result = await route(operationId, event.headers["x-correlation-id"], event.requestContext.domainName, event.headers, event.queryStringParameters, event.requestContext.http.path, event.body);
        if (!result.body)
            throw { code: 5002, message: `Internal error. ${JSON.stringify(result)}.` }

        // Validate only during testing (it is very slow for big messages!)
        if (VALIDATE) {
            let validation = VALIDATOR.validate(result.body, responseSchema);
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
    let mustAuthorize = false;

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

    let security = methodOAS["security"]
    if (security && security.length > 0 && security[0].bearerToken)
        mustAuthorize = true

    return [mustAuthorize, operationId, reqSchema, repSchema];
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