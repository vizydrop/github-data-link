const winston = require(`winston`);

const isProduction = process.env.NODE_ENV === `production`;
const isDevelopment = isProduction === false;

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            humanReadableUnhandledException: isDevelopment,
            json: isProduction,
            level: `info`,
            colorize: `true`,
            logstash: isProduction,
            prettyPrint: isDevelopment,
            stringify: isProduction,
            timestamp: true,
        }),
    ],
});

module.exports = logger;
