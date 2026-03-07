const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Configure multer for voice uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = config.paths.uploads;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `voice_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (Whisper limit)
    fileFilter: (req, file, cb) => {
        const allowed = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'video/webm'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат аудио'));
        }
    },
});

/**
 * POST /api/voice
 * Accepts audio file, transcribes via OpenAI Whisper
 * Returns: { text: "transcribed text" }
 */
router.post('/', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Аудиофайл не получен' });
    }

    const filePath = req.file.path;

    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: config.openai.apiKey });

        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(filePath),
            language: 'ru',
        });

        // Clean up uploaded file
        fs.unlink(filePath, () => { });

        logger.info('Voice transcribed', { length: transcription.text.length });

        res.json({ text: transcription.text });

    } catch (error) {
        // Clean up uploaded file on error
        fs.unlink(filePath, () => { });

        logger.error('Whisper API error', { message: error.message });
        res.status(500).json({ error: 'Ошибка транскрибации. Попробуйте ещё раз.' });
    }
});

module.exports = router;
