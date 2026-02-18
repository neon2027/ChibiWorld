import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'chibiworld.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    const count = db.prepare('SELECT COUNT(*) as c FROM furniture_catalog').get();
    if (count.c === 0) {
        const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
        db.exec(seed);
        console.log('[DB] Seed data inserted.');
    }
    console.log('[DB] Database ready.');
}

export default db;
