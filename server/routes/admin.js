const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const databaseManager = require('../services/databaseManager');
const sessionManager = require('../services/sessionManager');
const logger = require('../utils/logger');

// In-memory admin store (for simplicity; in production, use SQLite)
let adminUsers = [];

/** Initialize default admin user */
function initAdmin() {
    const hash = bcrypt.hashSync(config.admin.password, 10);
    adminUsers.push({
        id: 1,
        username: config.admin.username,
        passwordHash: hash,
    });
    logger.info('Admin user initialized', { username: config.admin.username });
}

// === AUTH ===

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const user = adminUsers.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, username: user.username });
});

// === PROTECTED ROUTES (require auth) ===
router.use(authMiddleware);

// --- Databases CRUD ---

// GET /api/admin/db/:dbName
router.get('/db/:dbName', (req, res) => {
    const { dbName } = req.params;
    const keyMap = {
        'model-numbers': 'modelNumbers',
        'price-category': 'priceCategory',
        'company-info': 'companyInfo',
        'exception': 'exception',
        'algorithms': 'algorithms',
    };

    const key = keyMap[dbName];
    if (!key) return res.status(404).json({ error: 'База не найдена' });

    res.json(databaseManager.get(key));
});

// PUT /api/admin/db/:dbName
router.put('/db/:dbName', (req, res) => {
    const { dbName } = req.params;
    const keyMap = {
        'model-numbers': 'modelNumbers',
        'price-category': 'priceCategory',
        'company-info': 'companyInfo',
        'exception': 'exception',
        'algorithms': 'algorithms',
    };

    const key = keyMap[dbName];
    if (!key) return res.status(404).json({ error: 'База не найдена' });

    try {
        databaseManager.update(key, req.body);
        res.json({ success: true, message: 'База обновлена' });
    } catch (err) {
        logger.error('DB update error', { error: err.message });
        res.status(500).json({ error: 'Ошибка обновления базы' });
    }
});

// --- Dialogs ---

// GET /api/admin/dialogs
router.get('/dialogs', (req, res) => {
    const sessions = sessionManager.getAllSessions();
    res.json(sessions);
});

// GET /api/admin/dialogs/:sessionId
router.get('/dialogs/:sessionId', (req, res) => {
    const session = sessionManager.getFullSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Диалог не найден' });
    res.json(session);
});

// --- Measures ---

// GET /api/admin/measures
router.get('/measures', (req, res) => {
    const sessions = sessionManager.getAllSessions();
    const measures = sessions
        .filter(s => s.clientData?.Gorod || s.clientData?.Phone)
        .map(s => ({
            sessionId: s.id,
            clientName: s.clientData?.Client_name || 'Не указано',
            city: s.clientData?.Gorod || '',
            street: s.clientData?.Ylitsa || '',
            phone: s.clientData?.Phone || '',
            preferredTime: s.clientData?.Vremya_client || '',
            createdAt: s.createdAt,
        }));

    res.json(measures);
});

module.exports = { router, initAdmin };
