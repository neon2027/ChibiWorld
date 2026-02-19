import * as worldState from '../services/worldState.js';

// Track who is in voice per channel: 'plaza' or 'room:{id}'
const voiceChannels = new Map(); // channelKey -> Set of userId

function getChannelKey(socketId) {
    const player = worldState.getPlayer(socketId);
    if (!player) return null;
    if (player.location === 'plaza') return 'plaza';
    if (player.location === 'room' && player.roomId) return `room:${player.roomId}`;
    return null;
}

export function registerVoiceSocket(io, socket, userId, username) {

    // Send current voice members snapshot to any user entering the channel area
    socket.on('voice:requestSnapshot', () => {
        const channelKey = getChannelKey(socket.id);
        if (!channelKey) return;
        const channel = voiceChannels.get(channelKey);
        const members = channel
            ? [...channel].map(uid => {
                const p = worldState.getPlayerByUserId(uid);
                return { userId: uid, username: p?.username || '?' };
            })
            : [];
        socket.emit('voice:snapshot', { members });
    });

    socket.on('voice:join', () => {
        const channelKey = getChannelKey(socket.id);
        if (!channelKey) return;

        if (!voiceChannels.has(channelKey)) voiceChannels.set(channelKey, new Set());
        const channel = voiceChannels.get(channelKey);

        // Tell the joiner about existing voice members (for WebRTC setup)
        const existingMembers = [...channel].filter(id => id !== userId);
        socket.emit('voice:existingMembers', { members: existingMembers });

        // Notify existing voice members (for WebRTC offer)
        for (const memberId of channel) {
            const memberSocketId = worldState.getSocketIdByUserId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit('voice:userJoined', { userId, username });
            }
        }

        channel.add(userId);

        // Broadcast to ALL users in this location that someone joined voice
        socket.to(channelKey).emit('voice:memberJoined', { userId, username });
        console.log(`[Voice] ${username} joined voice in ${channelKey}`);
    });

    socket.on('voice:leave', () => {
        _leaveVoice(io, socket, userId, username);
    });

    // Relay WebRTC offer
    socket.on('voice:offer', ({ toUserId, sdp }) => {
        const toSocketId = worldState.getSocketIdByUserId(toUserId);
        if (toSocketId) {
            io.to(toSocketId).emit('voice:offer', { fromUserId: userId, fromUsername: username, sdp });
        }
    });

    // Relay WebRTC answer
    socket.on('voice:answer', ({ toUserId, sdp }) => {
        const toSocketId = worldState.getSocketIdByUserId(toUserId);
        if (toSocketId) {
            io.to(toSocketId).emit('voice:answer', { fromUserId: userId, sdp });
        }
    });

    // Relay ICE candidate
    socket.on('voice:ice', ({ toUserId, candidate }) => {
        const toSocketId = worldState.getSocketIdByUserId(toUserId);
        if (toSocketId) {
            io.to(toSocketId).emit('voice:ice', { fromUserId: userId, candidate });
        }
    });

    // Speaking state broadcast
    socket.on('voice:speaking', ({ speaking }) => {
        const channelKey = getChannelKey(socket.id);
        if (!channelKey) return;
        // Broadcast to the Socket.IO room (plaza / room:id)
        socket.to(channelKey).emit('voice:speakingUpdate', { userId, speaking });
    });

    socket.on('disconnect', () => {
        _leaveVoice(io, socket, userId, username);
    });
}

function _leaveVoice(io, socket, userId, username) {
    for (const [key, channel] of voiceChannels) {
        if (channel.has(userId)) {
            channel.delete(userId);
            if (channel.size === 0) voiceChannels.delete(key);

            // Notify remaining voice members (for WebRTC cleanup)
            for (const memberId of channel) {
                const socketId = worldState.getSocketIdByUserId(memberId);
                if (socketId) {
                    io.to(socketId).emit('voice:userLeft', { userId });
                }
            }

            // Broadcast to ALL users in this location that someone left voice
            socket.to(key).emit('voice:memberLeft', { userId });
            console.log(`[Voice] ${username} left voice in ${key}`);
            break;
        }
    }
}
