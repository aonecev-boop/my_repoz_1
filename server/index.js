const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const databaseManager = require('./services/databaseManager');
const { chatLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Routes
const chatRouter = require('./routes/chat');
const uploadRouter = require('./routes/upload');
const { router: adminRouter, initAdmin } = require('./routes/admin');

const app = express();

// === SECURITY ===
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
}));

// === BODY PARSERS ===
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// === STATIC FILES ===
app.use('/widget', express.static(config.paths.clientWidget));
app.use('/admin', express.static(config.paths.clientAdmin));

// === API ROUTES ===
app.use('/api/chat', chatLimiter, chatRouter);
app.use('/api/upload', chatLimiter, uploadRouter);
app.use('/api/admin', adminRouter);

// === ROOT ===
app.get('/', (req, res) => {
    res.json({
        name: 'АлИИна — ИИ-консультант',
        status: 'running',
        version: '1.0.0',
    });
});

// === EMBED SCRIPT ===
app.get('/embed.js', (req, res) => {
    res.sendFile(path.join(config.paths.clientWidget, 'embed.js'));
});

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// === START ===
function start() {
    // Init databases
    databaseManager.init();

    // Init admin user
    initAdmin();

    app.listen(config.port, () => {
        logger.info(`Server started on port ${config.port}`);
        logger.info(`Widget: http://localhost:${config.port}/widget/`);
        logger.info(`Admin: http://localhost:${config.port}/admin/`);
        logger.info(`API: http://localhost:${config.port}/api/chat`);
    });
}

start();

module.exports = app;
