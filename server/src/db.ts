import sqlite3 from 'sqlite3';
import path from 'path';

export const db = new sqlite3.Database(path.join(__dirname, '..', 'data.db'), (err) => {
  if (err) console.error('Failed to open database:', err.message);
  else console.log('Connected to SQLite database.');
});

export const setupDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_name TEXT NOT NULL,
        serial_number TEXT,
        quantity INTEGER DEFAULT 1,
        expiry_date TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  });
};
