const fs = require('fs');
const path = require('path');
const config = require('../config');

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = config.nodeEnv === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatDate() {
    return new Date().toISOString();
}

function writeToFile(level, message, data) {
    const logDir = config.paths.logs;
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `${date}.log`);
    const line = `[${formatDate()}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    fs.appendFileSync(logFile, line, 'utf-8');
}

const logger = {
    info(message, data) {
        if (currentLevel >= LOG_LEVELS.info) {
            console.log(`[INFO] ${message}`, data || '');
            writeToFile('info', message, data);
        }
    },
    warn(message, data) {
        if (currentLevel >= LOG_LEVELS.warn) {
            console.warn(`[WARN] ${message}`, data || '');
            writeToFile('warn', message, data);
        }
    },
    error(message, data) {
        console.error(`[ERROR] ${message}`, data || '');
        writeToFile('error', message, data);
    },
    debug(message, data) {
        if (currentLevel >= LOG_LEVELS.debug) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    },
};

module.exports = logger;
