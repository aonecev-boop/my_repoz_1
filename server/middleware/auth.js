const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.adminUser = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Неверный или истёкший токен' });
    }
}

module.exports = authMiddleware;
