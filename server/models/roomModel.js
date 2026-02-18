import db from '../../db/database.js';

export function getRoomByOwner(ownerId) {
    return db.prepare('SELECT * FROM rooms WHERE owner_id = ?').get(ownerId);
}

export function getRoom(roomId) {
    return db.prepare(`
        SELECT r.*, u.username as owner_name
        FROM rooms r JOIN users u ON u.id = r.owner_id
        WHERE r.id = ?
    `).get(roomId);
}

export function listPublic(limit = 20, offset = 0) {
    return db.prepare(`
        SELECT r.id, r.name, r.theme, u.username as owner_name
        FROM rooms r JOIN users u ON u.id = r.owner_id
        WHERE r.is_public = 1
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);
}

export function updateRoom(roomId, ownerId, { name, isPublic, theme }) {
    db.prepare('UPDATE rooms SET name = ?, is_public = ?, theme = ? WHERE id = ? AND owner_id = ?')
      .run(name, isPublic ? 1 : 0, theme, roomId, ownerId);
}

export function getFurniture(roomId) {
    return db.prepare('SELECT * FROM furniture WHERE room_id = ? ORDER BY id').all(roomId);
}

export function placeFurniture(roomId, { itemType, posX, posY, posZ, rotY, color }) {
    const result = db.prepare(
        'INSERT INTO furniture (room_id, item_type, pos_x, pos_y, pos_z, rotation_y, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(roomId, itemType, posX, posY, posZ, rotY, color);
    return { id: result.lastInsertRowid, room_id: roomId, item_type: itemType, pos_x: posX, pos_y: posY, pos_z: posZ, rotation_y: rotY, color };
}

export function moveFurniture(furnitureId, roomId, { posX, posY, posZ, rotY }) {
    db.prepare('UPDATE furniture SET pos_x = ?, pos_y = ?, pos_z = ?, rotation_y = ? WHERE id = ? AND room_id = ?')
      .run(posX, posY, posZ, rotY, furnitureId, roomId);
}

export function removeFurniture(furnitureId, roomId) {
    db.prepare('DELETE FROM furniture WHERE id = ? AND room_id = ?').run(furnitureId, roomId);
}

export function getCatalog() {
    return db.prepare('SELECT * FROM furniture_catalog ORDER BY category, display_name').all();
}

export function createInvite(roomId, inviterId, inviteeId) {
    try {
        const result = db.prepare(
            'INSERT OR REPLACE INTO room_invites (room_id, inviter_id, invitee_id, status) VALUES (?, ?, ?, ?)'
        ).run(roomId, inviterId, inviteeId, 'pending');
        return result.lastInsertRowid;
    } catch { return null; }
}

export function hasAccess(roomId, userId, ownerId) {
    if (userId === ownerId) return true;
    const invite = db.prepare(
        'SELECT 1 FROM room_invites WHERE room_id = ? AND invitee_id = ? AND status = ?'
    ).get(roomId, userId, 'accepted');
    return !!invite;
}

export function acceptInvite(roomId, inviteeId) {
    db.prepare('UPDATE room_invites SET status = ? WHERE room_id = ? AND invitee_id = ?').run('accepted', roomId, inviteeId);
}
