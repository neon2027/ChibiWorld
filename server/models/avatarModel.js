import db from '../../db/database.js';

export function getAvatar(userId) {
    return db.prepare('SELECT * FROM avatars WHERE user_id = ?').get(userId);
}

export function updateAvatar(userId, { skinTone, hairColor, hairStyle, outfitColor, eyeColor, accessory }) {
    db.prepare(`
        UPDATE avatars SET
            skin_tone = ?, hair_color = ?, hair_style = ?,
            outfit_color = ?, eye_color = ?, accessory = ?
        WHERE user_id = ?
    `).run(skinTone, hairColor, hairStyle, outfitColor, eyeColor, accessory, userId);
    return getAvatar(userId);
}
