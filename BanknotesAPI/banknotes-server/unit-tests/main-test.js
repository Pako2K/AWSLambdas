const TESTED_JS = 'main.js'
const { handler } = require(`../src/${TESTED_JS}`);

console.log(`TESTING ${TESTED_JS}`);

const tests = [{
        name: 'test-pathparameter',
        result: { statusCode: 200, body: [] },
        event: {
            "version": "2.0",
            "routeKey": "$default",
            "rawPath": "/currency/1/issue",
            "rawQueryString": "q=8&w=9",
            "headers": {
                "sec-fetch-mode": "navigate",
                "x-amzn-tls-version": "TLSv1.2",
                "sec-fetch-site": "none",
                "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,de;q=0.7,es;q=0.6",
                "x-forwarded-proto": "https",
                "x-forwarded-port": "443",
                "x-forwarded-for": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                "sec-fetch-user": "?1",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "x-amzn-tls-cipher-suite": "ECDHE-RSA-AES128-GCM-SHA256",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "x-amzn-trace-id": "Root=1-65691cd6-3f19c4101a278b016695c214",
                "sec-ch-ua-platform": "\"Windows\"",
                "host": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "upgrade-insecure-requests": "1",
                "cache-control": "max-age=0",
                "accept-encoding": "gzip, deflate, br",
                "sec-fetch-dest": "document",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
            },
            "queryStringParameters": {
                "q": "8",
                "w": "9"
            },
            "requestContext": {
                "accountId": "anonymous",
                "apiId": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "domainName": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "domainPrefix": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "http": {
                    "method": "GET",
                    "path": "/currency/1/issue",
                    "protocol": "HTTP/1.1",
                    "sourceIp": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
                },
                "requestId": "748088ee-9f0d-4bd1-9928-29f4fdd94388",
                "routeKey": "$default",
                "stage": "$default",
                "time": "30/Nov/2023:23:37:58 +0000",
                "timeEpoch": 1701387478648
            },
            "isBase64Encoded": false
        },
        context: {}
    },
    {
        name: 'test-territorytypes',
        result: { statusCode: 200, body: [] },
        event: {
            "version": "2.0",
            "routeKey": "$default",
            "rawPath": "/territory-type",
            "rawQueryString": "q=8&w=9",
            "headers": {
                "sec-fetch-mode": "navigate",
                "x-amzn-tls-version": "TLSv1.2",
                "sec-fetch-site": "none",
                "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,de;q=0.7,es;q=0.6",
                "x-forwarded-proto": "https",
                "x-forwarded-port": "443",
                "x-forwarded-for": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                "sec-fetch-user": "?1",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "x-amzn-tls-cipher-suite": "ECDHE-RSA-AES128-GCM-SHA256",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "x-amzn-trace-id": "Root=1-65691cd6-3f19c4101a278b016695c214",
                "sec-ch-ua-platform": "\"Windows\"",
                "host": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "upgrade-insecure-requests": "1",
                "cache-control": "max-age=0",
                "accept-encoding": "gzip, deflate, br",
                "sec-fetch-dest": "document",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
            },
            "queryStringParameters": {
                "q": "8",
                "w": "9"
            },
            "requestContext": {
                "accountId": "anonymous",
                "apiId": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "domainName": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "domainPrefix": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "http": {
                    "method": "GET",
                    "path": "/territory-type",
                    "protocol": "HTTP/1.1",
                    "sourceIp": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
                },
                "requestId": "748088ee-9f0d-4bd1-9928-29f4fdd94388",
                "routeKey": "$default",
                "stage": "$default",
                "time": "30/Nov/2023:23:37:58 +0000",
                "timeEpoch": 1701387478648
            },
            "isBase64Encoded": false
        },
        context: {}
    },
    {
        name: 'test-continents',
        result: { statusCode: 200, body: [{ "id": 4, "name": "Africa" }, { "id": 2, "name": "North America" }, { "id": 3, "name": "South America" }, { "id": 5, "name": "Asia" }, { "id": 6, "name": "Europe" }, { "id": 7, "name": "Oceania" }] },
        event: {
            "version": "2.0",
            "routeKey": "$default",
            "rawPath": "/continent",
            "rawQueryString": "q=8&w=9",
            "headers": {
                "sec-fetch-mode": "navigate",
                "x-amzn-tls-version": "TLSv1.2",
                "sec-fetch-site": "none",
                "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,de;q=0.7,es;q=0.6",
                "x-forwarded-proto": "https",
                "x-forwarded-port": "443",
                "x-forwarded-for": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                "sec-fetch-user": "?1",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "x-amzn-tls-cipher-suite": "ECDHE-RSA-AES128-GCM-SHA256",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "x-amzn-trace-id": "Root=1-65691cd6-3f19c4101a278b016695c214",
                "sec-ch-ua-platform": "\"Windows\"",
                "host": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "upgrade-insecure-requests": "1",
                "cache-control": "max-age=0",
                "accept-encoding": "gzip, deflate, br",
                "sec-fetch-dest": "document",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
            },
            "queryStringParameters": {
                "q": "8",
                "w": "9"
            },
            "requestContext": {
                "accountId": "anonymous",
                "apiId": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "domainName": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq.lambda-url.eu-central-1.on.aws",
                "domainPrefix": "u6brp6d7ibdm5qyr4vmv73ieku0wgxuq",
                "http": {
                    "method": "GET",
                    "path": "/continent",
                    "protocol": "HTTP/1.1",
                    "sourceIp": "2a02:810d:47c0:11b4:e073:a847:4a90:4003",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
                },
                "requestId": "748088ee-9f0d-4bd1-9928-29f4fdd94388",
                "routeKey": "$default",
                "stage": "$default",
                "time": "30/Nov/2023:23:37:58 +0000",
                "timeEpoch": 1701387478648
            },
            "isBase64Encoded": false
        },
        context: {}
    }
]

let passedCounter = 0;
for (const test of tests) {
    console.log(`Executing ${test.name}...`);
    handler(test.event, test.context)
        .then((result) => {
            const resultStr = JSON.stringify(result);
            const expectedStr = JSON.stringify(test.result);

            if (resultStr === expectedStr) {
                console.log(`${test.name} => Successful!!`);
                passedCounter++;
            } else
                console.log(`${test.name} => FAILED!!.\n   Result: ${resultStr}\n   Expected: ${expectedStr}`);

            if (test.name === tests[tests.length - 1].name) logSummary();
        })
        .catch((reason) => {
            console.log(`${test.name} Exception!!.\n ${reason}`);
            if (test.name === tests[tests.length - 1].name) logSummary();
        });
}

function logSummary() {
    console.log(`EXECUTED ${tests.length} TEST CASES. PASSED: ${passedCounter} - FAILED: ${tests.length-passedCounter}`);
}