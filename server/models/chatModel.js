import db from '../../db/database.js';

export function saveMessage({ senderId, recipientId = null, content, channel = 'global' }) {
    const stmt = db.prepare('INSERT INTO messages (sender_id, recipient_id, content, channel) VALUES (?, ?, ?, ?)');
    const result = stmt.run(senderId, recipientId, content, channel);
    return result.lastInsertRowid;
}

export function getGlobalHistory(limit = 50) {
    return db.prepare(`
        SELECT m.id, m.content, m.created_at, m.channel,
               u.id as sender_id, u.username as sender_name
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE m.channel = 'global'
        ORDER BY m.created_at DESC LIMIT ?
    `).all(limit).reverse();
}

export function getWhisperHistory(userId1, userId2, limit = 30) {
    return db.prepare(`
        SELECT m.id, m.content, m.created_at, m.channel,
               u.id as sender_id, u.username as sender_name
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE m.channel = 'whisper'
          AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
        ORDER BY m.created_at DESC LIMIT ?
    `).all(userId1, userId2, userId2, userId1, limit).reverse();
}
