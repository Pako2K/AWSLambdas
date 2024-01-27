/* Logger class */
/****************/
class Logger {
    constructor(appName, correlationId, key) {
        const enabled = process.env.LOG_LEVEL || "INFO";

        const keySeparator = key ? " # " : "";
        appName = appName ? appName : "NO-APP";
        correlationId = correlationId ? correlationId : "NO-CORR-ID";

        const text = (level, msg) => { return `${level} - ${appName} # ${correlationId}${keySeparator}${key??""} : ${msg}`; };
        const log = (level, msg) => console.log(text(level, msg));
        const err = (level, msg) => console.error(text(level, msg));

        switch (enabled) {
            case "DEBUG":
                this.debug = (msg) => log("DEBUG", msg);
            case "INFO":
                this.info = (msg) => log("INFO ", msg);
            case "WARN":
                this.warn = (msg) => log("WARN ", msg);
            case "ERROR":
                this.error = (msg) => err("ERROR", msg);
        }
    }

    debug(msg) {};
    info(msg) {};
    warn(msg) {};
    err(msg) {};
}

module.exports.Logger = Logger;