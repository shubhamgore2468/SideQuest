import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

type SqlRow = Record<string, unknown>;
class LocalStatement {
  private values: SQLInputValue[] = [];
  private readonly db: DatabaseSync;
  private readonly sql: string;
  constructor(db: DatabaseSync, sql: string) { this.db = db; this.sql = sql; }
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  first<T extends SqlRow>() { return this.db.prepare(this.sql).get(...this.values) as T | undefined ?? null; }
  all<T extends SqlRow>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  run() { return this.db.prepare(this.sql).run(...this.values); }
}

class LocalDatabase {
  private readonly db: DatabaseSync;
  constructor(db: DatabaseSync) { this.db = db; }
  prepare(sql: string) { return new LocalStatement(this.db, sql); }
}

const globalDb = globalThis as typeof globalThis & { __sidequestDb?: LocalDatabase };
export function database() {
  if (globalDb.__sidequestDb) return globalDb.__sidequestDb;
  const file = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'sidequest.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const migration = readFileSync(path.join(process.cwd(), 'migrations', '0000_init.sql'), 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    const sql = statement
      .replace(/CREATE TABLE `/g, 'CREATE TABLE IF NOT EXISTS `')
      .replace(/CREATE UNIQUE INDEX `/g, 'CREATE UNIQUE INDEX IF NOT EXISTS `')
      .replace(/CREATE INDEX `/g, 'CREATE INDEX IF NOT EXISTS `')
      .trim();
    if (sql) db.exec(sql);
  }
  globalDb.__sidequestDb = new LocalDatabase(db);
  return globalDb.__sidequestDb;
}
