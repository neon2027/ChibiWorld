import db from '../../db/database.js';

export function sendRequest(requesterId, recipientId) {
    // Check existing
    const existing = db.prepare(
        'SELECT * FROM friends WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)'
    ).get(requesterId, recipientId, recipientId, requesterId);
    if (existing) return { error: existing.status === 'accepted' ? 'Already friends' : 'Request already exists' };

    const result = db.prepare('INSERT INTO friends (requester_id, recipient_id) VALUES (?, ?)').run(requesterId, recipientId);
    return { id: result.lastInsertRowid };
}

export function accept(requestId, recipientId) {
    db.prepare('UPDATE friends SET status = ? WHERE id = ? AND recipient_id = ?').run('accepted', requestId, recipientId);
}

export function decline(requestId, recipientId) {
    db.prepare('UPDATE friends SET status = ? WHERE id = ? AND recipient_id = ?').run('declined', requestId, recipientId);
}

export function remove(userId, friendId) {
    db.prepare(`
        DELETE FROM friends
        WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))
          AND status = 'accepted'
    `).run(userId, friendId, friendId, userId);
}

export function listFriends(userId) {
    return db.prepare(`
        SELECT u.id, u.username, u.last_online,
               f.id as friendship_id
        FROM friends f
        JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END
        WHERE (f.requester_id = ? OR f.recipient_id = ?) AND f.status = 'accepted'
    `).all(userId, userId, userId);
}

export function listPendingRequests(userId) {
    return db.prepare(`
        SELECT f.id, u.id as from_user_id, u.username as from_username
        FROM friends f JOIN users u ON u.id = f.requester_id
        WHERE f.recipient_id = ? AND f.status = 'pending'
    `).all(userId);
}

export function areFriends(userId1, userId2) {
    return !!db.prepare(`
        SELECT 1 FROM friends
        WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))
          AND status = 'accepted'
    `).get(userId1, userId2, userId2, userId1);
}

export function getFriendIds(userId) {
    const rows = db.prepare(`
        SELECT CASE WHEN requester_id = ? THEN recipient_id ELSE requester_id END as friend_id
        FROM friends WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'
    `).all(userId, userId, userId);
    return rows.map(r => r.friend_id);
}
