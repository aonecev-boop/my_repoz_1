const config = require('../config');

function fileValidator(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не прикреплён' });
    }

    // Check size
    const maxBytes = config.upload.maxSizeMB * 1024 * 1024;
    if (req.file.size > maxBytes) {
        return res.status(413).json({
            error: `Файл слишком большой. Максимум ${config.upload.maxSizeMB} МБ.`,
        });
    }

    // Check type
    if (!config.upload.allowedTypes.includes(req.file.mimetype)) {
        return res.status(415).json({
            error: 'Неподдерживаемый формат файла. Допустимы: JPG, PNG, PDF.',
        });
    }

    next();
}

module.exports = fileValidator;
