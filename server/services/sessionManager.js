const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class SessionManager {
    constructor() {
        /** @type {Map<string, object>} */
        this.sessions = new Map();

        // Cleanup expired sessions every 5 minutes
        setInterval(() => this._cleanup(), 5 * 60 * 1000);
    }

    /** Create a new session */
    createSession() {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            clientData: {
                Client_name: '',
                Mebel_name: '',
                Dlina: '',
                Gorod: '',
                Ylitsa: '',
                Vremya_client: '',
                Client_Project: '',
                Orientir_price: '',
                Phone: '',
            },
            messages: [],
            flags: {
                nameAsked: false,
                nameReceived: false,
                modelQuestionAsked: false,
                confirmationAsked: false,
                calculationDone: false,
                measureOffered: false,
                dialogStopped: false,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    /** Get session by ID */
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'active') {
            session.updatedAt = new Date();
            return session;
        }
        return null;
    }

    /** Get or create session */
    getOrCreateSession(sessionId) {
        if (sessionId) {
            const existing = this.getSession(sessionId);
            if (existing) return existing;
        }
        return this.createSession();
    }

    /** Add a message to session history */
    addMessage(sessionId, role, content) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.messages.push({
            role,
            content,
            timestamp: new Date().toISOString(),
        });

        // Keep only last N messages in memory for context
        if (session.messages.length > config.session.maxHistoryMessages * 2) {
            session.messages = session.messages.slice(-config.session.maxHistoryMessages * 2);
        }

        session.updatedAt = new Date();
    }

    /** Update client data field */
    updateClientData(sessionId, field, value) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.clientData[field] = value;
        session.updatedAt = new Date();
    }

    /** Update session flags */
    updateFlag(sessionId, flag, value) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.flags[flag] = value;
        session.updatedAt = new Date();
    }

    /** Get messages formatted for OpenAI */
    getOpenAIMessages(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return [];

        return session.messages
            .slice(-config.session.maxHistoryMessages)
            .map(m => ({ role: m.role, content: m.content }));
    }

    /** Close session */
    closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'closed';
            session.updatedAt = new Date();
        }
    }

    /** Get all sessions (for admin) */
    getAllSessions() {
        return Array.from(this.sessions.values()).map(s => ({
            id: s.id,
            clientName: s.clientData.Client_name,
            status: s.status,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messageCount: s.messages.length,
            clientData: s.clientData,
        }));
    }

    /** Get full session with messages (for admin) */
    getFullSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    /** Cleanup expired sessions */
    _cleanup() {
        const now = Date.now();
        const timeoutMs = config.session.timeoutMinutes * 60 * 1000;

        for (const [id, session] of this.sessions) {
            if (session.status === 'active' && (now - session.updatedAt.getTime()) > timeoutMs) {
                session.status = 'expired';
            }
        }
    }
}

module.exports = new SessionManager();
