const fs = require('fs');
const path = require('path');
const databaseManager = require('../services/databaseManager');

/**
 * Builds the system prompt dynamically from algorithm + databases + session context
 */
function buildPrompt(session) {
    const databases = databaseManager.getAll();

    // Part 1: Static algorithm (from 1_idea.md)
    const algorithm = getAlgorithmPart();

    // Part 2: Dynamic databases
    const dbSection = formatDatabases(databases);

    // Part 3: Session context
    const sessionContext = formatSessionContext(session);

    return `${algorithm}\n\n${dbSection}\n\n${sessionContext}`;
}

function getAlgorithmPart() {
    const databases = databaseManager.getAll();

    // Load algorithms from database (editable from admin panel)
    if (databases.algorithms && databases.algorithms.algorithms && databases.algorithms.algorithms.length > 0) {
        const sections = databases.algorithms.algorithms
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        let result = '# РОЛЬ И ПРАВИЛА\n\n';
        for (const section of sections) {
            result += `## ${section.title}\n${section.content}\n\n`;
        }
        return result;
    }

    // Fallback: minimal prompt if no algorithms found
    return `# РОЛЬ И ПРАВИЛА

Ты — Ассистент **АлИИна**, официальный консультант мебельной студии «Встрой-мебель.ру».
Квалифицируй клиента, собери данные и рассчитай ориентировочную стоимость мебели.
Всегда представляйся в начале беседы и узнай имя клиента.`;
}

function formatDatabases(databases) {
    let result = '# БАЗЫ ДАННЫХ\n\n';

    // Models
    if (databases.modelNumbers && databases.modelNumbers.models) {
        result += '## [DB-MODEL-NUMBERS] — Модели мебели и цены\n';
        for (const model of databases.modelNumbers.models) {
            if (model.price) {
                result += `- №${model.id}: ${model.name} — ${model.price.toLocaleString('ru-RU')} ₽/м\n`;
            }
        }
        result += '\n';
    }

    // Categories
    if (databases.priceCategory && databases.priceCategory.categories) {
        result += '## [DB-PRICE-CATEGORY] — Цены по категориям\n';
        for (const cat of databases.priceCategory.categories) {
            if (cat.pricePerMeter) {
                result += `- ${cat.name}: ${cat.pricePerMeter.toLocaleString('ru-RU')} ₽/м\n`;
            } else if (cat.pricePerUnit) {
                result += `- ${cat.name}: ${cat.pricePerUnit.toLocaleString('ru-RU')} ₽/${cat.unit}\n`;
            }
        }
        result += '\n';
    }

    // Company info
    if (databases.companyInfo && databases.companyInfo.sections) {
        result += '## [DB-COMPANY-INFO] — Информация о компании\n';
        for (const section of databases.companyInfo.sections) {
            result += `### ${section.title}\n${section.content}\n\n`;
        }
    }

    // Exceptions
    if (databases.exception && databases.exception.exceptions) {
        result += '## [DB-EXCEPTION] — Мебель, которой мы НЕ занимаемся\n';
        for (const ex of databases.exception.exceptions) {
            result += `- ${ex}\n`;
        }
        result += '\n';
    }

    return result;
}

function formatSessionContext(session) {
    if (!session) return '';

    let result = '# КОНТЕКСТ ТЕКУЩЕЙ СЕССИИ\n\n';
    result += '## Собранные данные клиента:\n';

    for (const [key, value] of Object.entries(session.clientData)) {
        if (value) {
            result += `- ${key}: ${value}\n`;
        }
    }

    result += '\n## Флаги:\n';
    for (const [key, value] of Object.entries(session.flags)) {
        if (value) {
            result += `- ${key}: ${value}\n`;
        }
    }

    return result;
}

module.exports = { buildPrompt };
