const fs = require('fs');
const path = require('path');
const config = require('../config');

class DatabaseManager {
    constructor() {
        this.cache = {};
        this.watchers = {};
        this.dbFiles = {
            modelNumbers: config.db.modelNumbers,
            priceCategory: config.db.priceCategory,
            companyInfo: config.db.companyInfo,
            exception: config.db.exception,
            algorithms: config.db.algorithms,
        };
    }

    /** Load all JSON databases into memory */
    init() {
        for (const [key, filename] of Object.entries(this.dbFiles)) {
            this._loadFile(key, filename);
            this._watchFile(key, filename);
        }
        console.log('[DatabaseManager] All databases loaded into memory');
    }

    _loadFile(key, filename) {
        const filePath = path.join(config.paths.data, filename);
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            this.cache[key] = JSON.parse(raw);
        } catch (err) {
            console.error(`[DatabaseManager] Error loading ${filename}:`, err.message);
            this.cache[key] = {};
        }
    }

    _watchFile(key, filename) {
        const filePath = path.join(config.paths.data, filename);
        try {
            let debounce = null;
            this.watchers[key] = fs.watch(filePath, () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    console.log(`[DatabaseManager] Hot-reload: ${filename}`);
                    this._loadFile(key, filename);
                }, 200);
            });
        } catch (err) {
            console.warn(`[DatabaseManager] Could not watch ${filename}:`, err.message);
        }
    }

    /** Get cached data */
    get(key) {
        return this.cache[key] || {};
    }

    /** Get all databases (for prompt builder) */
    getAll() {
        return { ...this.cache };
    }

    /** Update a database file and refresh cache */
    update(key, data) {
        const filename = this.dbFiles[key];
        if (!filename) throw new Error(`Unknown database key: ${key}`);

        const filePath = path.join(config.paths.data, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        this.cache[key] = data;
        console.log(`[DatabaseManager] Updated ${filename}`);
    }

    /** Close all watchers */
    close() {
        for (const watcher of Object.values(this.watchers)) {
            watcher.close();
        }
    }
}

module.exports = new DatabaseManager();
