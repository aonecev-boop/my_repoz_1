require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // OpenAI / OpenRouter
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || (
      (process.env.OPENAI_API_KEY || '').startsWith('sk-or-')
        ? 'https://openrouter.ai/api/v1'
        : undefined
    ),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0.3,
    maxTokens: 1500,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: '24h',
  },

  // Paths
  paths: {
    data: path.join(__dirname, '..', 'data'),
    uploads: path.join(__dirname, '..', 'uploads'),
    logs: path.join(__dirname, '..', 'logs'),
    clientWidget: path.join(__dirname, '..', 'client', 'widget'),
    clientAdmin: path.join(__dirname, '..', 'client', 'admin'),
  },

  // Database files
  db: {
    modelNumbers: 'db-model-numbers.json',
    priceCategory: 'db-price-category.json',
    companyInfo: 'db-company-info.json',
    exception: 'db-exception.json',
    sqlite: 'database.sqlite',
  },

  // Session
  session: {
    timeoutMinutes: 30,
    maxHistoryMessages: 20,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },

  // File upload
  upload: {
    maxSizeMB: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // Admin credentials (for initial setup)
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  // Notifications
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    managerEmail: process.env.MANAGER_EMAIL,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
};
