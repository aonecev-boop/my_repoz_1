/**
 * АлИИна — Admin Panel
 * SPA: Login → Dashboard with sidebar navigation
 */

(function () {
    'use strict';

    const API_BASE = '';
    let token = localStorage.getItem('aliina_admin_token');
    let currentSection = 'overview';

    // ============================================
    // Init
    // ============================================
    function init() {
        if (token) {
            renderDashboard();
        } else {
            renderLogin();
        }
    }

    // ============================================
    // Login Page
    // ============================================
    function renderLogin() {
        const root = document.getElementById('admin-root');
        root.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="logo">А</div>
          <h1>АлИИна</h1>
          <p class="subtitle">Панель управления</p>
          <div class="form-group">
            <label>Логин</label>
            <input type="text" id="login-user" placeholder="admin" autofocus>
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input type="password" id="login-pass" placeholder="••••••">
          </div>
          <button class="btn-primary" id="login-btn">Войти</button>
          <p class="login-error" id="login-error"></p>
        </div>
      </div>
    `;

        document.getElementById('login-btn').addEventListener('click', doLogin);
        document.getElementById('login-pass').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doLogin();
        });
    }

    async function doLogin() {
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-pass').value;
        const errorEl = document.getElementById('login-error');

        if (!username || !password) {
            errorEl.textContent = 'Введите логин и пароль';
            errorEl.style.display = 'block';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Ошибка авторизации');
            }

            const data = await res.json();
            token = data.token;
            localStorage.setItem('aliina_admin_token', token);
            renderDashboard();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }

    // ============================================
    // Dashboard
    // ============================================
    function renderDashboard() {
        const root = document.getElementById('admin-root');
        root.innerHTML = `
      <div class="dashboard">
        <nav class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-logo">А</div>
            <span class="sidebar-brand">АлИИна</span>
          </div>
          <ul class="sidebar-nav">
            <li data-section="overview" class="active">📊 <span>Обзор</span></li>
            <li data-section="models">📦 <span>Модели</span></li>
            <li data-section="prices">💰 <span>Цены</span></li>
            <li data-section="company">🏢 <span>Компания</span></li>
            <li data-section="exceptions">🚫 <span>Исключения</span></li>
            <li data-section="dialogs">💬 <span>Диалоги</span></li>
            <li data-section="measures">📐 <span>Замеры</span></li>
          </ul>
          <div class="sidebar-footer">
            <button id="logout-btn">Выйти</button>
          </div>
        </nav>
        <main class="main-content" id="main-content"></main>
      </div>
    `;

        // Nav click handlers
        document.querySelectorAll('.sidebar-nav li').forEach(li => {
            li.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                currentSection = li.dataset.section;
                renderSection(currentSection);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            token = null;
            localStorage.removeItem('aliina_admin_token');
            renderLogin();
        });

        renderSection('overview');
    }

    // ============================================
    // Section Router
    // ============================================
    function renderSection(section) {
        const main = document.getElementById('main-content');
        switch (section) {
            case 'overview': renderOverview(main); break;
            case 'models': renderModels(main); break;
            case 'prices': renderPrices(main); break;
            case 'company': renderCompany(main); break;
            case 'exceptions': renderExceptions(main); break;
            case 'dialogs': renderDialogs(main); break;
            case 'measures': renderMeasures(main); break;
        }
    }

    // ============================================
    // API Helper
    // ============================================
    async function apiGet(path) {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.status === 401) { token = null; localStorage.removeItem('aliina_admin_token'); renderLogin(); return null; }
        return res.json();
    }

    async function apiPut(path, data) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return res.json();
    }

    // ============================================
    // Overview
    // ============================================
    async function renderOverview(el) {
        const dialogs = await apiGet('/api/admin/dialogs') || [];
        const measures = await apiGet('/api/admin/measures') || [];

        el.innerHTML = `
      <h1 class="page-title">📊 Обзор</h1>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${dialogs.length}</div>
          <div class="stat-label">Всего диалогов</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${dialogs.filter(d => d.status === 'active').length}</div>
          <div class="stat-label">Активных</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${measures.length}</div>
          <div class="stat-label">Заявок на замер</div>
        </div>
      </div>
    `;
    }

    // ============================================
    // Models
    // ============================================
    async function renderModels(el) {
        const data = await apiGet('/api/admin/db/model-numbers');
        if (!data || !data.models) { el.innerHTML = '<p>Ошибка загрузки</p>'; return; }

        el.innerHTML = `
      <h1 class="page-title">📦 Модели мебели</h1>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Все модели (${data.models.length})</span>
          <button class="btn btn-add" id="add-model-btn">+ Добавить</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>№</th><th>Название</th><th>Категория</th><th>Цена ₽/м</th><th>Действия</th></tr>
          </thead>
          <tbody>
            ${data.models.map(m => `
              <tr>
                <td>${m.id}</td>
                <td>${m.name}</td>
                <td>${m.category}</td>
                <td>${m.price ? m.price.toLocaleString('ru-RU') : '—'}</td>
                <td>
                  <button class="btn btn-sm btn-delete" onclick="window._deleteModel(${typeof m.id === 'string' ? "'" + m.id + "'" : m.id})">✕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

        window._deleteModel = async (id) => {
            if (!confirm('Удалить модель?')) return;
            data.models = data.models.filter(m => m.id !== id);
            await apiPut('/api/admin/db/model-numbers', data);
            showToast('Модель удалена');
            renderModels(el);
        };

        document.getElementById('add-model-btn').addEventListener('click', () => {
            const id = prompt('Номер модели:');
            const name = prompt('Название:');
            const category = prompt('Категория (напр. shkaf-kupe):');
            const price = prompt('Цена за метр:');
            if (id && name) {
                data.models.push({ id: isNaN(id) ? id : parseInt(id), name, category: category || '', price: parseInt(price) || null });
                apiPut('/api/admin/db/model-numbers', data).then(() => {
                    showToast('Модель добавлена');
                    renderModels(el);
                });
            }
        });
    }

    // ============================================
    // Prices
    // ============================================
    async function renderPrices(el) {
        const data = await apiGet('/api/admin/db/price-category');
        if (!data || !data.categories) { el.innerHTML = '<p>Ошибка загрузки</p>'; return; }

        el.innerHTML = `
      <h1 class="page-title">💰 Цены по категориям</h1>
      <div class="card">
        <table class="data-table">
          <thead>
            <tr><th>Категория</th><th>Цена за метр ₽</th><th>Действия</th></tr>
          </thead>
          <tbody>
            ${data.categories.map(c => `
              <tr>
                <td>${c.name}</td>
                <td><input type="number" value="${c.pricePerMeter || c.pricePerUnit || ''}" data-id="${c.id}" class="price-input" style="width:100px;border:1px solid #E8E2D9;border-radius:4px;padding:4px 8px;"></td>
                <td>${c.unit ? c.unit : 'м'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:16px;text-align:right;">
          <button class="btn btn-save" id="save-prices">Сохранить</button>
        </div>
      </div>
    `;

        document.getElementById('save-prices').addEventListener('click', async () => {
            document.querySelectorAll('.price-input').forEach(input => {
                const cat = data.categories.find(c => c.id === input.dataset.id);
                if (cat) {
                    if (cat.pricePerMeter !== undefined) cat.pricePerMeter = parseInt(input.value) || 0;
                    if (cat.pricePerUnit !== undefined) cat.pricePerUnit = parseInt(input.value) || 0;
                }
            });
            await apiPut('/api/admin/db/price-category', data);
            showToast('Цены сохранены ✓');
        });
    }

    // ============================================
    // Company Info
    // ============================================
    async function renderCompany(el) {
        const data = await apiGet('/api/admin/db/company-info');
        if (!data || !data.sections) { el.innerHTML = '<p>Ошибка загрузки</p>'; return; }

        el.innerHTML = `
      <h1 class="page-title">🏢 Информация о компании</h1>
      ${data.sections.map(s => `
        <div class="card">
          <div class="card-title">${s.title}</div>
          <textarea class="company-text" data-id="${s.id}" style="width:100%;min-height:80px;margin-top:12px;border:1px solid #E8E2D9;border-radius:8px;padding:10px;font-family:var(--font-body);font-size:13px;resize:vertical;">${s.content}</textarea>
        </div>
      `).join('')}
      <div style="text-align:right;margin-bottom:20px;">
        <button class="btn btn-save" id="save-company">Сохранить все</button>
      </div>
    `;

        document.getElementById('save-company').addEventListener('click', async () => {
            document.querySelectorAll('.company-text').forEach(ta => {
                const section = data.sections.find(s => s.id === ta.dataset.id);
                if (section) section.content = ta.value;
            });
            await apiPut('/api/admin/db/company-info', data);
            showToast('Информация сохранена ✓');
        });
    }

    // ============================================
    // Exceptions
    // ============================================
    async function renderExceptions(el) {
        const data = await apiGet('/api/admin/db/exception');
        if (!data || !data.exceptions) { el.innerHTML = '<p>Ошибка загрузки</p>'; return; }

        el.innerHTML = `
      <h1 class="page-title">🚫 Исключения</h1>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Мебель, которой мы не занимаемся</span>
          <button class="btn btn-add" id="add-exc-btn">+ Добавить</button>
        </div>
        <ul style="list-style:none;padding:0;">
          ${data.exceptions.map((ex, i) => `
            <li style="padding:8px 12px;border-bottom:1px solid #E8E2D9;display:flex;justify-content:space-between;align-items:center;">
              ${ex}
              <button class="btn btn-sm btn-delete" onclick="window._deleteExc(${i})">✕</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

        window._deleteExc = async (idx) => {
            data.exceptions.splice(idx, 1);
            await apiPut('/api/admin/db/exception', data);
            showToast('Удалено');
            renderExceptions(el);
        };

        document.getElementById('add-exc-btn').addEventListener('click', async () => {
            const name = prompt('Тип мебели:');
            if (name) {
                data.exceptions.push(name);
                await apiPut('/api/admin/db/exception', data);
                showToast('Добавлено');
                renderExceptions(el);
            }
        });
    }

    // ============================================
    // Dialogs
    // ============================================
    async function renderDialogs(el) {
        const dialogs = await apiGet('/api/admin/dialogs') || [];

        el.innerHTML = `
      <h1 class="page-title">💬 Диалоги</h1>
      <div class="dialogs-layout">
        <div class="dialog-list" id="dialog-list">
          ${dialogs.length === 0 ? '<p style="padding:20px;color:#7A7A7A;text-align:center;">Пока нет диалогов</p>' :
                dialogs.map(d => `
              <div class="dialog-item" data-id="${d.id}">
                <div class="name">👤 ${d.clientName || 'Без имени'}</div>
                <div class="preview">${d.clientData?.Mebel_name || 'Общий вопрос'}</div>
                <div class="time">${new Date(d.createdAt).toLocaleString('ru-RU')} · ${d.messageCount} сообщ.</div>
              </div>
            `).join('')}
        </div>
        <div class="dialog-detail" id="dialog-detail">
          <p style="color:#7A7A7A;text-align:center;">Выберите диалог для просмотра</p>
        </div>
      </div>
    `;

        document.querySelectorAll('.dialog-item').forEach(item => {
            item.addEventListener('click', async () => {
                document.querySelectorAll('.dialog-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                const session = await apiGet(`/api/admin/dialogs/${item.dataset.id}`);
                if (session) renderDialogDetail(session);
            });
        });
    }

    function renderDialogDetail(session) {
        const detail = document.getElementById('dialog-detail');
        detail.innerHTML = `
      <div style="margin-bottom:12px;">
        <strong>Клиент:</strong> ${session.clientData?.Client_name || 'Не указано'} · 
        <strong>Статус:</strong> ${session.status}
      </div>
      <div style="margin-bottom:12px;padding:10px;background:#F8F6F3;border-radius:8px;font-size:12px;">
        <strong>JSON клиента:</strong><br>
        <pre style="margin-top:4px;white-space:pre-wrap;">${JSON.stringify(session.clientData, null, 2)}</pre>
      </div>
      <div>
        ${(session.messages || []).map(m => `
          <div class="dialog-msg ${m.role === 'user' ? 'user' : 'bot'}">
            <div class="bubble">${m.content}</div>
            <div class="msg-time">${new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('')}
      </div>
    `;
    }

    // ============================================
    // Measures
    // ============================================
    async function renderMeasures(el) {
        const measures = await apiGet('/api/admin/measures') || [];

        el.innerHTML = `
      <h1 class="page-title">📐 Заявки на замер</h1>
      <div class="card">
        ${measures.length === 0 ? '<p style="color:#7A7A7A;">Нет активных заявок на замер.</p>' : `
          <table class="data-table">
            <thead>
              <tr><th>Имя</th><th>Город</th><th>Улица</th><th>Телефон</th><th>Время</th><th>Дата</th></tr>
            </thead>
            <tbody>
              ${measures.map(m => `
                <tr>
                  <td>${m.clientName}</td>
                  <td>${m.city || '—'}</td>
                  <td>${m.street || '—'}</td>
                  <td>${m.phone || '—'}</td>
                  <td>${m.preferredTime || '—'}</td>
                  <td>${new Date(m.createdAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
    }

    // ============================================
    // Toast
    // ============================================
    function showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
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
