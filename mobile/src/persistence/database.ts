import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('pocketcode.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS agent_event (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS note (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
  }
  return db;
}

export interface StoredEvent {
  id: number;
  session: string;
  kind: string;
  summary: string;
  ts: number;
}

export function addEvent(session: string, kind: string, summary: string, ts: number): void {
  const database = getDatabase();
  database.runSync(
    'INSERT INTO agent_event (session, kind, summary, ts) VALUES (?, ?, ?, ?)',
    session, kind, summary, ts
  );
}

export function getEventsBySession(session: string): StoredEvent[] {
  const database = getDatabase();
  return database.getAllSync<StoredEvent>(
    'SELECT * FROM agent_event WHERE session = ? ORDER BY ts',
    session
  );
}

export function getAllEvents(): StoredEvent[] {
  const database = getDatabase();
  return database.getAllSync<StoredEvent>(
    'SELECT * FROM agent_event ORDER BY ts DESC'
  );
}

export interface Note {
  id: number;
  content: string;
  updatedAt: number;
}

export function addNote(content: string): number {
  const database = getDatabase();
  const result = database.runSync(
    'INSERT INTO note (content, updatedAt) VALUES (?, ?)',
    content, Date.now()
  );
  return result.lastInsertRowId;
}

export function updateNote(id: number, content: string): void {
  const database = getDatabase();
  database.runSync(
    'UPDATE note SET content = ?, updatedAt = ? WHERE id = ?',
    content, Date.now(), id
  );
}

export function deleteNote(id: number): void {
  const database = getDatabase();
  database.runSync('DELETE FROM note WHERE id = ?', id);
}

export function getAllNotes(): Note[] {
  const database = getDatabase();
  return database.getAllSync<Note>(
    'SELECT * FROM note ORDER BY updatedAt DESC'
  );
}
