const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'New project',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL REFERENCES threads(id),
    role TEXT NOT NULL,
    ai_provider TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL REFERENCES threads(id),
    covers_up_to_message_id INTEGER NOT NULL,
    summary_text TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL REFERENCES threads(id),
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by_ai TEXT,
    UNIQUE(thread_id, path)
  );
`);

function createThread(title = "New project") {
  const info = db.prepare(`INSERT INTO threads (title) VALUES (?)`).run(title);
  return getThread(info.lastInsertRowid);
}
function getThread(id) {
  return db.prepare(`SELECT * FROM threads WHERE id = ?`).get(id);
}
function listThreads() {
  return db.prepare(`SELECT * FROM threads ORDER BY id DESC`).all();
}

function addMessage(threadId, role, aiProvider, content) {
  const info = db
    .prepare(
      `INSERT INTO messages (thread_id, role, ai_provider, content) VALUES (?, ?, ?, ?)`
    )
    .run(threadId, role, aiProvider, content);
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);
}
function getMessages(threadId) {
  return db
    .prepare(`SELECT * FROM messages WHERE thread_id = ? ORDER BY id ASC`)
    .all(threadId);
}
function getMessagesSince(threadId, afterMessageId) {
  return db
    .prepare(
      `SELECT * FROM messages WHERE thread_id = ? AND id > ? ORDER BY id ASC`
    )
    .all(threadId, afterMessageId || 0);
}

function getLatestSummary(threadId) {
  return db
    .prepare(
      `SELECT * FROM summaries WHERE thread_id = ? ORDER BY id DESC LIMIT 1`
    )
    .get(threadId);
}
function saveSummary(threadId, coversUpToMessageId, summaryText) {
  db.prepare(
    `INSERT INTO summaries (thread_id, covers_up_to_message_id, summary_text) VALUES (?, ?, ?)`
  ).run(threadId, coversUpToMessageId, summaryText);
}

function upsertFile(threadId, filePath, content, aiProvider) {
  db.prepare(
    `INSERT INTO files (thread_id, path, content, updated_by_ai)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(thread_id, path) DO UPDATE SET
       content = excluded.content,
       updated_by_ai = excluded.updated_by_ai,
       updated_at = datetime('now')`
  ).run(threadId, filePath, content, aiProvider);
}
function listFiles(threadId) {
  return db
    .prepare(`SELECT * FROM files WHERE thread_id = ? ORDER BY path ASC`)
    .all(threadId);
}

module.exports = {
  createThread,
  getThread,
  listThreads,
  addMessage,
  getMessages,
  getMessagesSince,
  getLatestSummary,
  saveSummary,
  upsertFile,
  listFiles,
};
