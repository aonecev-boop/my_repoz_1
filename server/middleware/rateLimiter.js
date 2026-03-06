const rateLimit = require('express-rate-limit');
const config = require('../config');

const chatLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { error: 'Слишком много запросов. Попробуйте через минуту.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Слишком много запросов.' },
});

module.exports = { chatLimiter, adminLimiter };
