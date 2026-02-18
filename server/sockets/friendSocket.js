import * as worldState from '../services/worldState.js';
import * as friendModel from '../models/friendModel.js';
import { findByUsername } from '../models/userModel.js';

export function registerFriendSocket(io, socket, userId, username) {

    socket.on('friend:request', ({ toUsername }) => {
        if (typeof toUsername !== 'string') return;
        const target = findByUsername(toUsername.trim());
        if (!target) return socket.emit('error', { message: 'User not found' });
        if (target.id === userId) return socket.emit('error', { message: 'Cannot friend yourself' });

        const result = friendModel.sendRequest(userId, target.id);
        if (result.error) return socket.emit('error', { message: result.error });

        const targetSocketId = worldState.getSocketIdByUserId(target.id);
        if (targetSocketId) {
            io.to(targetSocketId).emit('friend:requestReceived', {
                requestId: result.id, fromUserId: userId, fromUsername: username
            });
        }
        socket.emit('friend:requestSent', { toUsername: target.username });
    });

    socket.on('friend:accept', ({ requestId }) => {
        if (typeof requestId !== 'number') return;
        friendModel.accept(requestId, userId);

        // Find requester from DB and notify them
        const friends = friendModel.listFriends(userId);
        const newFriend = friends.find(f => f.friendship_id === requestId);
        if (newFriend) {
            const requesterSocketId = worldState.getSocketIdByUserId(newFriend.id);
            if (requesterSocketId) {
                io.to(requesterSocketId).emit('friend:requestAccepted', { userId, username });
            }
            // Notify each other of online status
            socket.emit('friend:online', { userId: newFriend.id });
            if (requesterSocketId) io.to(requesterSocketId).emit('friend:online', { userId });
        }
    });

    socket.on('friend:decline', ({ requestId }) => {
        if (typeof requestId !== 'number') return;
        friendModel.decline(requestId, userId);
    });

    socket.on('friend:remove', ({ friendId }) => {
        if (typeof friendId !== 'number') return;
        friendModel.remove(userId, friendId);
        const friendSocketId = worldState.getSocketIdByUserId(friendId);
        if (friendSocketId) io.to(friendSocketId).emit('friend:removed', { userId });
        socket.emit('friend:removed', { userId: friendId });
    });
}

export function broadcastOnlineStatus(io, userId, online) {
    const friendIds = friendModel.getFriendIds(userId);
    for (const friendId of friendIds) {
        const socketId = worldState.getSocketIdByUserId(friendId);
        if (socketId) {
            io.to(socketId).emit(online ? 'friend:online' : 'friend:offline', { userId });
        }
    }
}

export function getFriendRoutes(router, requireAuth) {
    router.get('/api/friends', requireAuth, (req, res) => {
        const friends = friendModel.listFriends(req.session.userId);
        const withStatus = friends.map(f => ({ ...f, online: worldState.isOnline(f.id) }));
        res.json(withStatus);
    });

    router.get('/api/friends/requests', requireAuth, (req, res) => {
        res.json(friendModel.listPendingRequests(req.session.userId));
    });
}
