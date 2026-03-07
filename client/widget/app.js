/**
 * АлИИна — Full-Screen Chat Application
 * Voice messages, file upload, responsive design
 */

(function () {
    'use strict';

    const API_BASE = window.ALIINA_API_BASE || '';
    let sessionId = localStorage.getItem('aliina_session_id') || null;
    let isWaitingResponse = false;



    // ============================================
    // Init
    // ============================================
    function init() {
        // Event listeners
        document.getElementById('send-btn').addEventListener('click', sendMessage);
        document.getElementById('attach-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', handleFileSelect);

        document.getElementById('new-chat-btn').addEventListener('click', startNewChat);

        // Mobile info panel
        document.getElementById('mobile-info-btn').addEventListener('click', () => {
            document.getElementById('mobile-info-overlay').classList.remove('hidden');
        });
        document.getElementById('close-info-btn').addEventListener('click', () => {
            document.getElementById('mobile-info-overlay').classList.add('hidden');
        });
        document.getElementById('mobile-info-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.add('hidden');
            }
        });

        // Input field
        const input = document.getElementById('input-field');
        input.addEventListener('input', () => {
            document.getElementById('send-btn').disabled = input.value.trim().length === 0;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Send initial greeting
        sendInitialGreeting();
    }

    // ============================================
    // Messages
    // ============================================
    function addMessage(text, role, isVoice = false) {
        const container = document.getElementById('messages');
        const msg = document.createElement('div');
        msg.className = `msg ${role}${isVoice ? ' voice' : ''}`;

        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        if (role === 'bot') {
            msg.innerHTML = `
                <div class="msg-avatar">А</div>
                <div>
                    <div class="msg-bubble">${escapeHtml(text)}</div>
                    <div class="msg-time">${time}</div>
                </div>
            `;
        } else {
            const voiceIcon = isVoice ? `<svg class="voice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="1" width="6" height="14" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>` : '';
            msg.innerHTML = `
                <div>
                    <div class="msg-bubble">${voiceIcon}${escapeHtml(text)}</div>
                    <div class="msg-time">${time}</div>
                </div>
            `;
        }

        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    function showTyping() {
        const container = document.getElementById('messages');
        const typing = document.createElement('div');
        typing.className = 'typing';
        typing.id = 'typing-indicator';
        typing.innerHTML = `
            <div class="msg-avatar">А</div>
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    // ============================================
    // API Calls
    // ============================================
    async function sendMessage() {
        const input = document.getElementById('input-field');
        const text = input.value.trim();
        if (!text || isWaitingResponse) return;

        addMessage(text, 'user');
        input.value = '';
        document.getElementById('send-btn').disabled = true;

        isWaitingResponse = true;
        showTyping();

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: text }),
            });

            hideTyping();

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            sessionId = data.sessionId;
            localStorage.setItem('aliina_session_id', sessionId);

            addMessage(data.reply, 'bot');
            hideError();

        } catch (err) {
            hideTyping();
            showError();
            addMessage('Извините, произошла ошибка. Попробуйте ещё раз.', 'bot');
        } finally {
            isWaitingResponse = false;
        }
    }

    async function sendInitialGreeting() {
        showTyping();
        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: '__INIT__' }),
            });

            hideTyping();

            if (response.ok) {
                const data = await response.json();
                sessionId = data.sessionId;
                localStorage.setItem('aliina_session_id', sessionId);
                addMessage(data.reply, 'bot');
            }
        } catch (err) {
            hideTyping();
            addMessage('Здравствуйте! Я — АлИИна, ваша помощница и консультант Мебельной Студии "Встрой-Мебель.ру". Как вас зовут? 😊', 'bot');
        }
    }

    function startNewChat() {
        sessionId = null;
        localStorage.removeItem('aliina_session_id');
        document.getElementById('messages').innerHTML = '';
        sendInitialGreeting();
    }



    // ============================================
    // File Upload
    // ============================================
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        showFilePreview(file);
        uploadFile(file);
    }

    function showFilePreview(file) {
        const area = document.getElementById('file-area');
        area.innerHTML = `
            <div class="file-preview">
                📎 ${file.name} (${(file.size / 1024).toFixed(1)} КБ)
                <span class="remove" onclick="this.parentElement.remove()">✕</span>
            </div>
        `;
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId || '');

        showTyping();

        try {
            const response = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            hideTyping();

            if (response.ok) {
                const data = await response.json();
                sessionId = data.sessionId;
                localStorage.setItem('aliina_session_id', sessionId);
                addMessage('📎 Файл отправлен', 'user');
                addMessage(data.reply, 'bot');
            }
        } catch (err) {
            hideTyping();
            addMessage('Ошибка загрузки файла. Попробуйте ещё раз.', 'bot');
        }

        // Clear file area
        document.getElementById('file-area').innerHTML = '';
        document.getElementById('file-input').value = '';
    }

    // ============================================
    // Utilities
    // ============================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    function showError() {
        document.getElementById('error-bar').classList.add('show');
    }

    function hideError() {
        document.getElementById('error-bar').classList.remove('show');
    }

    // ============================================
    // Start
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
