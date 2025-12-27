const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

function init() {
  const sql = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );`;
  db.run(sql);
}

module.exports = { db, init };
