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

    socket.on('voice:join', () => {
        const channelKey = getChannelKey(socket.id);
        if (!channelKey) return;

        if (!voiceChannels.has(channelKey)) voiceChannels.set(channelKey, new Set());
        const channel = voiceChannels.get(channelKey);

        // Tell the joiner about existing voice members
        const existingMembers = [...channel].filter(id => id !== userId);
        socket.emit('voice:existingMembers', { members: existingMembers });

        // Notify existing members that this user joined voice
        for (const memberId of channel) {
            const memberSocketId = worldState.getSocketIdByUserId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit('voice:userJoined', { userId, username });
            }
        }

        channel.add(userId);
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

            // Notify remaining members
            for (const memberId of channel) {
                const socketId = worldState.getSocketIdByUserId(memberId);
                if (socketId) {
                    io.to(socketId).emit('voice:userLeft', { userId });
                }
            }
            console.log(`[Voice] ${username} left voice in ${key}`);
            break;
        }
    }
}
