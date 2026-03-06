const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

let client = null;

function getClient() {
    if (!client) {
        const opts = { apiKey: config.openai.apiKey };
        if (config.openai.baseURL) {
            opts.baseURL = config.openai.baseURL;
        }
        client = new OpenAI(opts);
    }
    return client;
}

/**
 * Send a chat completion request to OpenAI
 * @param {string} systemPrompt — system prompt
 * @param {Array<{role: string, content: string}>} messages — conversation history
 * @returns {Promise<string>} — AI response text
 */
async function complete(systemPrompt, messages) {
    const openai = getClient();

    const requestMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
    ];

    logger.debug('OpenAI request', {
        model: config.openai.model,
        messagesCount: requestMessages.length,
        systemPromptLength: systemPrompt.length,
    });

    try {
        const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages: requestMessages,
            temperature: config.openai.temperature,
            max_tokens: config.openai.maxTokens,
        });

        const reply = response.choices[0]?.message?.content || '';

        logger.debug('OpenAI response', {
            tokensUsed: response.usage?.total_tokens,
            replyLength: reply.length,
        });

        return reply;
    } catch (error) {
        logger.error('OpenAI API error', {
            message: error.message,
            status: error.status,
        });
        throw error;
    }
}

module.exports = { complete };
