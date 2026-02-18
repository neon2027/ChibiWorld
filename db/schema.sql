-- ChibiWorld Database Schema

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    last_online   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS avatars (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skin_tone     TEXT    NOT NULL DEFAULT '#f5c890',
    hair_color    TEXT    NOT NULL DEFAULT '#4a3728',
    hair_style    INTEGER NOT NULL DEFAULT 0,
    outfit_color  TEXT    NOT NULL DEFAULT '#ff7eb3',
    eye_color     TEXT    NOT NULL DEFAULT '#3a2a1a',
    accessory     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS friends (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT    NOT NULL DEFAULT 'pending',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(requester_id, recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_recipient ON friends(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends(requester_id, status);

CREATE TABLE IF NOT EXISTS messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  INTEGER,
    content       TEXT    NOT NULL,
    channel       TEXT    NOT NULL DEFAULT 'global',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_whisper ON messages(sender_id, recipient_id, created_at);

CREATE TABLE IF NOT EXISTS rooms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL DEFAULT 'My Room',
    is_public     INTEGER NOT NULL DEFAULT 0,
    theme         TEXT    NOT NULL DEFAULT 'default',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public);

CREATE TABLE IF NOT EXISTS furniture (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    item_type     TEXT    NOT NULL,
    pos_x         REAL    NOT NULL DEFAULT 0,
    pos_y         REAL    NOT NULL DEFAULT 0,
    pos_z         REAL    NOT NULL DEFAULT 0,
    rotation_y    REAL    NOT NULL DEFAULT 0,
    color         TEXT    NOT NULL DEFAULT '#ffffff'
);
CREATE INDEX IF NOT EXISTS idx_furniture_room ON furniture(room_id);

CREATE TABLE IF NOT EXISTS furniture_catalog (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type     TEXT    NOT NULL UNIQUE,
    display_name  TEXT    NOT NULL,
    category      TEXT    NOT NULL DEFAULT 'general',
    default_color TEXT    NOT NULL DEFAULT '#ffffff'
);

CREATE TABLE IF NOT EXISTS room_invites (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    inviter_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT    NOT NULL DEFAULT 'pending',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(room_id, invitee_id)
);
