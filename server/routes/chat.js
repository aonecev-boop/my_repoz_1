const express = require('express');
const router = express.Router();
const { buildPrompt } = require('../ai/promptBuilder');
const { complete } = require('../ai/openaiClient');
const { parseResponse } = require('../ai/responseParser');
const sessionManager = require('../services/sessionManager');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * POST /api/chat
 * Body: { sessionId?: string, message: string }
 *
 * Returns: { reply: string, sessionId: string }
 */
router.post('/', async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 2000 символов)' });
        }

        // Get or create session
        const session = sessionManager.getOrCreateSession(sessionId);

        // Check if dialog was stopped
        if (session.flags.dialogStopped) {
            return res.json({
                reply: 'Спасибо за обращение! Если у вас возникнут новые вопросы, мы всегда рады помочь. 😊',
                sessionId: session.id,
            });
        }

        // Add user message
        sessionManager.addMessage(session.id, 'user', message.trim());

        // Build prompt and get AI response
        const systemPrompt = buildPrompt(session);
        const messages = sessionManager.getOpenAIMessages(session.id);

        const rawReply = await complete(systemPrompt, messages);

        // Parse response
        const { clientText, dataUpdates, event } = parseResponse(rawReply);

        // Save assistant message
        sessionManager.addMessage(session.id, 'assistant', clientText);

        // Apply data updates
        if (dataUpdates) {
            for (const [field, value] of Object.entries(dataUpdates)) {
                sessionManager.updateClientData(session.id, field, value);
            }

            // Update flags based on data
            if (dataUpdates.Client_name) {
                sessionManager.updateFlag(session.id, 'nameReceived', true);
            }
        }

        // Handle events
        if (event) {
            logger.info('Event detected', { type: event.type, sessionId: session.id });

            if (event.type === 'dialog_stop') {
                sessionManager.updateFlag(session.id, 'dialogStopped', true);
                sessionManager.closeSession(session.id);
            }

            // Send notification
            try {
                await notificationService.notify(event.type, session);
            } catch (err) {
                logger.error('Notification failed', { error: err.message });
            }
        }

        res.json({
            reply: clientText,
            sessionId: session.id,
        });

    } catch (error) {
        logger.error('Chat error', { error: error.message });
        res.status(500).json({
            error: 'Произошла ошибка. Пожалуйста, попробуйте ещё раз.',
        });
    }
});

module.exports = router;
