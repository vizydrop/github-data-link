const logger = require(`./logger`);

const morgan = require(`morgan`);

morgan.token('path', (req) => req.path);

module.exports = () => morgan(`:method :status :path :response-time ms`, {
    stream: {write: (text) => logger.info(text)},
    skip: (req) => req.url === `/status`,
});