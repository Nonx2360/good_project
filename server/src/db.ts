import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(`Failed to open database at ${dbPath}:`, err.message);
  else console.log(`Connected to SQLite database at ${dbPath}.`);
});

export const setupDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_name TEXT NOT NULL,
        serial_number TEXT,
        quantity INTEGER DEFAULT 1,
        expiry_date TEXT,
        status TEXT DEFAULT 'in_stock',
        activated_at TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Migration: add new columns to existing tables
    db.run(`ALTER TABLE parts ADD COLUMN status TEXT DEFAULT 'in_stock'`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (status):', err.message);
      }
    });
    db.run(`ALTER TABLE parts ADD COLUMN activated_at TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (activated_at):', err.message);
      }
    });

    // Migrate existing parts that have an expiry_date set to 'active'
    db.run(`UPDATE parts SET status = 'active' WHERE expiry_date IS NOT NULL AND expiry_date != '' AND (status IS NULL OR status = 'in_stock')`);
  });
};
