const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const fileValidator = require('../middleware/fileValidator');
const sessionManager = require('../services/sessionManager');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionId = req.body.sessionId || 'unknown';
        const dir = path.join(config.paths.uploads, sessionId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
});

/**
 * POST /api/upload
 * Multipart form: file + sessionId
 */
router.post('/', upload.single('file'), fileValidator, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = sessionManager.getOrCreateSession(sessionId);

        // Update client data
        sessionManager.updateClientData(session.id, 'Client_Project', req.file.filename);

        const reply = 'Я вижу, вы прислали визуальный проект, поэтому чтобы понять задачи проекта и правильно его рассчитать, нам нужно его с вами обсудить и уточнить все нюансы.\nОбозначьте, пожалуйста, временной промежуток, когда вам можно позвонить, и нужен ваш номер телефона для обратной связи.\nСпасибо заранее! 💖';

        sessionManager.addMessage(session.id, 'assistant', reply);

        // Notify manager
        try {
            await notificationService.notify('project_received', session);
        } catch (err) {
            logger.error('Notification failed', { error: err.message });
        }

        res.json({
            reply,
            sessionId: session.id,
            fileName: req.file.filename,
        });

    } catch (error) {
        logger.error('Upload error', { error: error.message });
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

module.exports = router;
