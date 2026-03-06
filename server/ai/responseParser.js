const logger = require('../utils/logger');

/**
 * Parse AI response to extract:
 * 1. Text for the client (cleaned)
 * 2. JSON updates for client data
 * 3. Events (measure_request, manager_request, etc.)
 */
function parseResponse(rawResponse) {
    let clientText = rawResponse;
    let dataUpdates = null;
    let event = null;

    // Extract json_update block
    const jsonMatch = rawResponse.match(/```json_update\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
        try {
            dataUpdates = JSON.parse(jsonMatch[1].trim());
            clientText = clientText.replace(/```json_update\s*\n?[\s\S]*?\n?```/, '').trim();
        } catch (e) {
            logger.warn('Failed to parse json_update block', { raw: jsonMatch[1] });
        }
    }

    // Extract event block
    const eventMatch = rawResponse.match(/```event\s*\n?([\s\S]*?)\n?```/);
    if (eventMatch) {
        try {
            event = JSON.parse(eventMatch[1].trim());
            clientText = clientText.replace(/```event\s*\n?[\s\S]*?\n?```/, '').trim();
        } catch (e) {
            logger.warn('Failed to parse event block', { raw: eventMatch[1] });
        }
    }

    // Clean up any remaining code blocks that shouldn't be shown
    clientText = clientText.replace(/```[\s\S]*?```/g, '').trim();

    return {
        clientText,
        dataUpdates,
        event,
    };
}

module.exports = { parseResponse };
