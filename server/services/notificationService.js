const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
    }

    _getEmailTransporter() {
        if (!this.emailTransporter && config.email.host && config.email.user) {
            this.emailTransporter = nodemailer.createTransport({
                host: config.email.host,
                port: config.email.port,
                secure: config.email.port === 465,
                auth: {
                    user: config.email.user,
                    pass: config.email.pass,
                },
            });
        }
        return this.emailTransporter;
    }

    /**
     * Send notification about an event
     */
    async notify(eventType, sessionData) {
        const subject = this._getSubject(eventType);
        const body = this._formatBody(eventType, sessionData);

        // Try email
        await this._sendEmail(subject, body);

        // Try Telegram
        await this._sendTelegram(`${subject}\n\n${body}`);
    }

    _getSubject(eventType) {
        const subjects = {
            measure_request: '📐 Новая заявка на замер',
            manager_request: '👤 Клиент просит менеджера',
            project_received: '📎 Клиент прислал проект',
            dialog_stop: '🔴 Диалог завершён',
        };
        return subjects[eventType] || 'Уведомление от АлИИна';
    }

    _formatBody(eventType, sessionData) {
        if (!sessionData) return 'Нет данных';

        let body = '';
        body += `Имя клиента: ${sessionData.clientData?.Client_name || 'Не указано'}\n`;
        body += `Мебель: ${sessionData.clientData?.Mebel_name || 'Не указано'}\n`;

        if (sessionData.clientData?.Orientir_price) {
            body += `Ориент. стоимость: ${sessionData.clientData.Orientir_price}\n`;
        }
        if (sessionData.clientData?.Gorod) {
            body += `Город: ${sessionData.clientData.Gorod}\n`;
        }
        if (sessionData.clientData?.Ylitsa) {
            body += `Улица: ${sessionData.clientData.Ylitsa}\n`;
        }
        if (sessionData.clientData?.Phone) {
            body += `Телефон: ${sessionData.clientData.Phone}\n`;
        }
        if (sessionData.clientData?.Vremya_client) {
            body += `Удобное время: ${sessionData.clientData.Vremya_client}\n`;
        }

        body += `\nID сессии: ${sessionData.id}`;

        return body;
    }

    async _sendEmail(subject, body) {
        const transporter = this._getEmailTransporter();
        if (!transporter || !config.email.managerEmail) return;

        try {
            await transporter.sendMail({
                from: `"АлИИна" <${config.email.user}>`,
                to: config.email.managerEmail,
                subject,
                text: body,
            });
            logger.info('Email notification sent', { subject });
        } catch (err) {
            logger.error('Failed to send email', { error: err.message });
        }
    }

    async _sendTelegram(message) {
        if (!config.telegram.botToken || !config.telegram.chatId) return;

        try {
            const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegram.chatId,
                    text: message,
                    parse_mode: 'HTML',
                }),
            });

            if (!resp.ok) {
                throw new Error(`Telegram API: ${resp.status}`);
            }
            logger.info('Telegram notification sent');
        } catch (err) {
            logger.error('Failed to send Telegram', { error: err.message });
        }
    }
}

module.exports = new NotificationService();
