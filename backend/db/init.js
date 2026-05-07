// Database Initialization and Connection Manager using sql.js (WASM SQLite)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.BPR_USER_DATA 
  ? path.join(process.env.BPR_USER_DATA, 'bpr.db') 
  : path.resolve(__dirname, '..', process.env.DB_PATH || './db/bpr.db');

let db = null;
let dbReady = null;

function initDb() {
  if (dbReady) return dbReady;

  dbReady = initSqlJs().then(SQL => {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load database (Main process already copied the DB if missing)
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      console.log('CRITICAL ERROR: Database missing in AppData. Creating empty fallback...');
      db = new SQL.Database();
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      db.run(schema);
      saveDb();
    }

    db.run('PRAGMA foreign_keys = ON');
    
    console.log(`Database initialized at ${DB_PATH}`);
    return db;
  });

  return dbReady;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
    dbReady = null;
  }
}

// Helper functions to mimic better-sqlite3 API
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbGet(sql, params = []) {
  const results = dbAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified(), lastInsertRowid: dbGet('SELECT last_insert_rowid() as id').id };
}

module.exports = { initDb, getDb, closeDb, saveDb, dbAll, dbGet, dbRun };
