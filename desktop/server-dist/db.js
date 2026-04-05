"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDb = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
exports.db = new sqlite3_1.default.Database(path_1.default.join(__dirname, '..', 'data.db'), (err) => {
    if (err)
        console.error('Failed to open database:', err.message);
    else
        console.log('Connected to SQLite database.');
});
const setupDb = () => {
    exports.db.serialize(() => {
        exports.db.run(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_name TEXT NOT NULL,
        serial_number TEXT,
        quantity INTEGER DEFAULT 1,
        expiry_date TEXT NOT NULL
      )
    `);
        exports.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    });
};
exports.setupDb = setupDb;
