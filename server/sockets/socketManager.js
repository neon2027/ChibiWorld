import { wrap } from '../auth/authMiddleware.js';
import { getAvatar, updateAvatar } from '../models/avatarModel.js';
import { findById, updateLastOnline } from '../models/userModel.js';
import * as worldState from '../services/worldState.js';
import { registerWorldSocket } from './worldSocket.js';
import { registerChatSocket } from './chatSocket.js';
import { registerFriendSocket, broadcastOnlineStatus } from './friendSocket.js';
import { registerRoomSocket } from './roomSocket.js';
import { registerVoiceSocket } from './voiceSocket.js';
import { registerMiniGameSocket } from './miniGameSocket.js';

export function setupSockets(io, sessionMiddleware) {
    io.use(wrap(sessionMiddleware));

    io.use((socket, next) => {
        const sess = socket.request.session;
        if (sess?.userId) {
            socket.userId = sess.userId;
            next();
        } else {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        const user = findById(userId);
        if (!user) { socket.disconnect(); return; }

        const avatar = getAvatar(userId);
        updateLastOnline(userId);

        worldState.addPlayer(socket.id, {
            socketId: socket.id,
            userId,
            username: user.username,
            avatar: {
                skinTone: avatar.skin_tone,
                hairColor: avatar.hair_color,
                hairStyle: avatar.hair_style,
                outfitColor: avatar.outfit_color,
                eyeColor: avatar.eye_color,
                accessory: avatar.accessory
            }
        });

        // Join personal room for targeted events
        socket.join(`user:${userId}`);

        // Broadcast online to friends
        broadcastOnlineStatus(io, userId, true);

        // Register feature handlers
        registerWorldSocket(io, socket);
        registerChatSocket(io, socket, userId, user.username);
        registerFriendSocket(io, socket, userId, user.username);
        registerRoomSocket(io, socket, userId, user.username, {
            skinTone: avatar.skin_tone,
            hairColor: avatar.hair_color,
            hairStyle: avatar.hair_style,
            outfitColor: avatar.outfit_color,
            eyeColor: avatar.eye_color,
            accessory: avatar.accessory
        });

        registerVoiceSocket(io, socket, userId, user.username);
        registerMiniGameSocket(io, socket, userId, user.username);

        socket.on('avatar:update', (data) => {
            // handled via REST — emit updated avatar to others
            const player = worldState.getPlayer(socket.id);
            if (player) {
                player.avatar = data;
                if (player.location === 'plaza') {
                    socket.to('plaza').emit('avatar:updated', { userId, avatar: data });
                } else if (player.roomId) {
                    socket.to(`room:${player.roomId}`).emit('avatar:updated', { userId, avatar: data });
                }
            }
        });

        console.log(`[Socket] ${user.username} connected (${socket.id})`);

        socket.on('disconnect', () => {
            const player = worldState.getPlayer(socket.id);
            if (player) {
                if (player.location === 'plaza') {
                    socket.to('plaza').emit('plaza:playerLeft', { userId });
                } else if (player.roomId) {
                    socket.to(`room:${player.roomId}`).emit('room:playerLeft', { userId });
                }
            }
            worldState.removePlayer(socket.id);
            broadcastOnlineStatus(io, userId, false);
            console.log(`[Socket] ${user.username} disconnected`);
        });
    });
}
