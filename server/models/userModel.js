import db from '../../db/database.js';

export function findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findById(id) {
    return db.prepare('SELECT id, username, created_at, last_online FROM users WHERE id = ?').get(id);
}

export function create(username, passwordHash) {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);
    const userId = result.lastInsertRowid;
    // Create default avatar
    db.prepare('INSERT INTO avatars (user_id) VALUES (?)').run(userId);
    // Create default room
    db.prepare('INSERT INTO rooms (owner_id, name) VALUES (?, ?)').run(userId, `${username}'s Room`);
    return userId;
}

export function updateLastOnline(id) {
    db.prepare("UPDATE users SET last_online = datetime('now') WHERE id = ?").run(id);
}
