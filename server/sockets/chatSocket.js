import * as worldState from '../services/worldState.js';
import { saveMessage, getGlobalHistory, getWhisperHistory } from '../models/chatModel.js';
import { findByUsername, findById } from '../models/userModel.js';

const MAX_MSG_LEN = 500;
const RATE_LIMIT_MS = 1000;

export function registerChatSocket(io, socket, userId, username) {
    const lastMsg = { t: 0 };

    socket.on('chat:global', ({ content }) => {
        const now = Date.now();
        if (now - lastMsg.t < RATE_LIMIT_MS) return;
        lastMsg.t = now;

        if (typeof content !== 'string' || !content.trim() || content.length > MAX_MSG_LEN) return;
        const text = content.trim();

        saveMessage({ senderId: userId, content: text, channel: 'global' });
        io.emit('chat:global', {
            senderId: userId, senderName: username,
            content: text, timestamp: new Date().toISOString()
        });
    });

    socket.on('chat:whisper', ({ toUserId, content }) => {
        if (typeof content !== 'string' || !content.trim() || content.length > MAX_MSG_LEN) return;
        if (typeof toUserId !== 'number') return;
        const text = content.trim();

        const target = findById(toUserId);
        if (!target) return socket.emit('error', { message: 'User not found' });

        saveMessage({ senderId: userId, recipientId: toUserId, content: text, channel: 'whisper' });

        const payload = { senderId: userId, senderName: username, content: text, timestamp: new Date().toISOString() };
        socket.emit('chat:whisper', payload);

        const targetSocketId = worldState.getSocketIdByUserId(toUserId);
        if (targetSocketId) io.to(targetSocketId).emit('chat:whisper', payload);
    });

    socket.on('chat:typing', ({ channel, toUserId }) => {
        if (channel === 'global') {
            socket.to('plaza').emit('chat:typing', { userId, username, channel: 'global' });
        } else if (channel === 'whisper' && toUserId) {
            const targetSocketId = worldState.getSocketIdByUserId(toUserId);
            if (targetSocketId) io.to(targetSocketId).emit('chat:typing', { userId, username, channel: 'whisper' });
        }
    });
}

export function getChatHistoryRoutes(router, requireAuth) {
    router.get('/api/chat/history', requireAuth, (req, res) => {
        res.json(getGlobalHistory(50));
    });

    router.get('/api/chat/whisper/:userId', requireAuth, (req, res) => {
        const otherId = parseInt(req.params.userId);
        if (isNaN(otherId)) return res.status(400).json({ error: 'Invalid user id' });
        res.json(getWhisperHistory(req.session.userId, otherId, 30));
    });
}
