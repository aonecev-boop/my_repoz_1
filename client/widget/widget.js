/**
 * АлИИна — Chat Widget
 * Main widget logic: rendering, API calls, interactions
 */

(function () {
    'use strict';

    const API_BASE = window.ALIINA_API_BASE || '';
    let sessionId = localStorage.getItem('aliina_session_id') || null;
    let isOpen = false;
    let isWaitingResponse = false;
    let ttsEnabled = localStorage.getItem('aliina_tts') !== 'false'; // on by default

    // ============================================
    // SVG Icons
    // ============================================
    const ICONS = {
        chat: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        close: `<svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        send: `<svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>`,
        mic: `<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="1" width="6" height="14" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        attach: `<svg viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
        speakerOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
        speakerOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    };

    // ============================================
    // Build DOM
    // ============================================
    function createWidget() {
        const root = document.getElementById('aliina-widget-root') || document.body;

        // Floating Button
        const btn = document.createElement('button');
        btn.className = 'aliina-floating-btn';
        btn.id = 'aliina-trigger';
        btn.setAttribute('aria-label', 'Открыть чат с консультантом');
        btn.innerHTML = `${ICONS.chat}<span class="badge" id="aliina-badge"></span>`;
        btn.addEventListener('click', toggleChat);

        // Chat Window
        const chat = document.createElement('div');
        chat.className = 'aliina-chat hidden';
        chat.id = 'aliina-chat';
        chat.setAttribute('role', 'dialog');
        chat.setAttribute('aria-label', 'Чат с АлИИной');
        chat.innerHTML = `
      <div class="aliina-header">
        <div class="aliina-header-avatar">А</div>
        <div class="aliina-header-info">
          <div class="aliina-header-title">АлИИна — Консультант</div>
          <div class="aliina-header-status">Онлайн</div>
        </div>
        <button class="aliina-header-btn tts" id="aliina-tts" aria-label="Озвучка" title="Озвучка ответов">
          ${ttsEnabled ? ICONS.speakerOn : ICONS.speakerOff}
        </button>
        <button class="aliina-header-btn close" id="aliina-close" aria-label="Закрыть чат">
          ${ICONS.close}
        </button>
      </div>
      <div class="aliina-error-bar" id="aliina-error-bar">Нет связи. Переподключение...</div>
      <div class="aliina-messages" id="aliina-messages" role="log" aria-live="polite"></div>
      <div id="aliina-file-area"></div>
      <div class="aliina-input-panel">
        <button class="aliina-input-btn attach" id="aliina-attach" aria-label="Прикрепить файл">
          ${ICONS.attach}
        </button>
        <input type="text" class="aliina-input-field" id="aliina-input"
               placeholder="Введите сообщение..." maxlength="2000"
               aria-label="Поле ввода сообщения">
        <button class="aliina-input-btn mic" id="aliina-mic" aria-label="Голосовой ввод">
          ${ICONS.mic}
        </button>
        <button class="aliina-input-btn send" id="aliina-send" aria-label="Отправить" disabled>
          ${ICONS.send}
        </button>
      </div>
      <input type="file" id="aliina-file-input" accept=".jpg,.jpeg,.png,.pdf" style="display:none">
    `;

        root.appendChild(btn);
        root.appendChild(chat);

        // Event Listeners
        document.getElementById('aliina-close').addEventListener('click', toggleChat);
        document.getElementById('aliina-tts').addEventListener('click', toggleTTS);
        document.getElementById('aliina-send').addEventListener('click', sendMessage);
        document.getElementById('aliina-attach').addEventListener('click', () => {
            document.getElementById('aliina-file-input').click();
        });
        document.getElementById('aliina-file-input').addEventListener('change', handleFileSelect);

        const input = document.getElementById('aliina-input');
        input.addEventListener('input', () => {
            document.getElementById('aliina-send').disabled = input.value.trim().length === 0;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Voice input
        initVoice();

        // Send initial greeting on first open
    }

    // ============================================
    // Toggle Chat
    // ============================================
    function toggleChat() {
        const chat = document.getElementById('aliina-chat');
        const btn = document.getElementById('aliina-trigger');
        const badge = document.getElementById('aliina-badge');
        isOpen = !isOpen;

        if (isOpen) {
            chat.classList.remove('hidden');
            btn.style.display = 'none';
            badge.classList.remove('show');

            // If no messages, send greeting
            const messages = document.getElementById('aliina-messages');
            if (messages.children.length === 0) {
                sendInitialGreeting();
            }

            // Focus input
            setTimeout(() => {
                document.getElementById('aliina-input').focus();
            }, 300);
        } else {
            chat.classList.add('hidden');
            btn.style.display = 'flex';
        }
    }

    // ============================================
    // Messages
    // ============================================
    function addMessage(text, role) {
        const container = document.getElementById('aliina-messages');

        const msg = document.createElement('div');
        msg.className = `aliina-msg ${role}`;

        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        if (role === 'bot') {
            msg.innerHTML = `
        <div class="aliina-msg-avatar">А</div>
        <div>
          <div class="aliina-msg-bubble">${escapeHtml(text)}</div>
          <div class="aliina-msg-time">${time}</div>
        </div>
      `;
        } else {
            msg.innerHTML = `
        <div>
          <div class="aliina-msg-bubble">${escapeHtml(text)}</div>
          <div class="aliina-msg-time">${time}</div>
        </div>
      `;
        }

        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;

        // Auto-speak bot messages
        if (role === 'bot' && ttsEnabled) {
            speakText(text);
        }

        // Sound notification if chat is minimized
        if (!isOpen && role === 'bot') {
            const badge = document.getElementById('aliina-badge');
            badge.classList.add('show');
            playNotificationSound();
        }
    }

    function showTyping() {
        const container = document.getElementById('aliina-messages');
        const typing = document.createElement('div');
        typing.className = 'aliina-typing';
        typing.id = 'aliina-typing';
        typing.innerHTML = `
      <div class="aliina-msg-avatar">А</div>
      <div class="aliina-typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('aliina-typing');
        if (typing) typing.remove();
    }

    // ============================================
    // API Calls
    // ============================================
    async function sendMessage() {
        const input = document.getElementById('aliina-input');
        const text = input.value.trim();
        if (!text || isWaitingResponse) return;

        addMessage(text, 'user');
        input.value = '';
        document.getElementById('aliina-send').disabled = true;

        isWaitingResponse = true;
        showTyping();

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: text }),
            });

            hideTyping();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

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

    // ============================================
    // File Upload
    // ============================================
    let selectedFile = null;

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        selectedFile = file;
        showFilePreview(file);
        uploadFile(file);
    }

    function showFilePreview(file) {
        const area = document.getElementById('aliina-file-area');
        area.innerHTML = `
      <div class="aliina-file-preview">
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
        document.getElementById('aliina-file-area').innerHTML = '';
        document.getElementById('aliina-file-input').value = '';
        selectedFile = null;
    }

    // ============================================
    // Voice Input
    // ============================================
    function initVoice() {
        const micBtn = document.getElementById('aliina-mic');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            micBtn.style.display = 'none';
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;

        let isRecording = false;

        micBtn.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
                return;
            }

            isRecording = true;
            micBtn.classList.add('recording');
            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('aliina-input');
            input.value = transcript;
            document.getElementById('aliina-send').disabled = false;
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
        };

        recognition.onerror = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
        };
    }

    // ============================================
    // Text-to-Speech (TTS)
    // ============================================
    function toggleTTS() {
        ttsEnabled = !ttsEnabled;
        localStorage.setItem('aliina_tts', ttsEnabled);
        const btn = document.getElementById('aliina-tts');
        btn.innerHTML = ttsEnabled ? ICONS.speakerOn : ICONS.speakerOff;
        btn.title = ttsEnabled ? 'Озвучка включена' : 'Озвучка выключена';
        if (!ttsEnabled) {
            window.speechSynthesis.cancel();
        }
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) return;

        // Stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 0.9;

        // Try to find a Russian female voice
        const voices = window.speechSynthesis.getVoices();
        const ruVoice = voices.find(v => v.lang.startsWith('ru') && v.name.toLowerCase().includes('female'))
            || voices.find(v => v.lang.startsWith('ru'))
            || null;
        if (ruVoice) utterance.voice = ruVoice;

        window.speechSynthesis.speak(utterance);
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
        document.getElementById('aliina-error-bar').classList.add('show');
    }

    function hideError() {
        document.getElementById('aliina-error-bar').classList.remove('show');
    }

    function playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) { /* silent fail */ }
    }

    // ============================================
    // Init
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }

})();
