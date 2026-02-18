import * as worldState from '../services/worldState.js';
import * as roomState from '../services/roomState.js';
import * as roomModel from '../models/roomModel.js';

const ROOM_W = 12, ROOM_D = 10;

export function registerRoomSocket(io, socket, userId, username, avatar) {

    socket.on('room:join', ({ roomId }) => {
        if (typeof roomId !== 'number') return;
        const room = roomModel.getRoom(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        // Access check: owner, or accepted invite
        if (room.owner_id !== userId && !roomModel.hasAccess(roomId, userId, room.owner_id)) {
            return socket.emit('error', { message: 'No access to this room' });
        }
        if (room.is_public === 0 && room.owner_id !== userId) {
            const access = roomModel.hasAccess(roomId, userId, room.owner_id);
            if (!access) return socket.emit('error', { message: 'Room is private' });
        }

        // Leave previous room if any
        const prev = worldState.getPlayer(socket.id);
        if (prev?.roomId) {
            socket.leave(`room:${prev.roomId}`);
            roomState.playerLeaveRoom(prev.roomId, userId);
            socket.to(`room:${prev.roomId}`).emit('room:playerLeft', { userId });
        }
        // Leave plaza
        socket.leave('plaza');
        socket.to('plaza').emit('plaza:playerLeft', { userId });

        worldState.setPlayerLocation(socket.id, 'room', roomId);
        roomState.playerEnterRoom(roomId, userId);
        socket.join(`room:${roomId}`);

        const furniture = roomModel.getFurniture(roomId);
        const players = worldState.getPlayersInRoom(roomId);

        socket.emit('room:snapshot', {
            room: { id: room.id, name: room.name, theme: room.theme, ownerId: room.owner_id },
            furniture,
            players: players.filter(p => p.userId !== userId).map(p => ({
                id: p.userId, username: p.username, x: p.x, z: p.z, avatar: p.avatar
            }))
        });

        socket.to(`room:${roomId}`).emit('room:playerJoined', {
            id: userId, username, x: 6, z: 5, avatar
        });
    });

    socket.on('room:leave', () => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        const roomId = player.roomId;
        socket.leave(`room:${roomId}`);
        roomState.playerLeaveRoom(roomId, userId);
        socket.to(`room:${roomId}`).emit('room:playerLeft', { userId });
        worldState.setPlayerLocation(socket.id, 'none');
    });

    socket.on('room:move', ({ x, z }) => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        if (typeof x !== 'number' || typeof z !== 'number') return;
        const cx = Math.max(0, Math.min(ROOM_W, x));
        const cz = Math.max(0, Math.min(ROOM_D, z));
        worldState.movePlayer(socket.id, cx, cz);
        socket.to(`room:${player.roomId}`).emit('room:playerMoved', { userId, x: cx, z: cz });
    });

    socket.on('room:placeFurniture', ({ itemType, posX, posY, posZ, rotY, color }) => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        const room = roomModel.getRoom(player.roomId);
        if (!room || room.owner_id !== userId) return socket.emit('error', { message: 'Not room owner' });

        const item = roomModel.placeFurniture(player.roomId, { itemType, posX, posY: posY || 0, posZ, rotY: rotY || 0, color: color || '#ffffff' });
        io.to(`room:${player.roomId}`).emit('room:furniturePlaced', item);
    });

    socket.on('room:moveFurniture', ({ furnitureId, posX, posY, posZ, rotY }) => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        const room = roomModel.getRoom(player.roomId);
        if (!room || room.owner_id !== userId) return socket.emit('error', { message: 'Not room owner' });
        roomModel.moveFurniture(furnitureId, player.roomId, { posX, posY: posY || 0, posZ, rotY: rotY || 0 });
        io.to(`room:${player.roomId}`).emit('room:furnitureMoved', { furnitureId, posX, posY: posY || 0, posZ, rotY: rotY || 0 });
    });

    socket.on('room:removeFurniture', ({ furnitureId }) => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        const room = roomModel.getRoom(player.roomId);
        if (!room || room.owner_id !== userId) return socket.emit('error', { message: 'Not room owner' });
        roomModel.removeFurniture(furnitureId, player.roomId);
        io.to(`room:${player.roomId}`).emit('room:furnitureRemoved', { furnitureId });
    });

    socket.on('room:invite', ({ toUserId }) => {
        const player = worldState.getPlayer(socket.id);
        if (!player?.roomId) return;
        const room = roomModel.getRoom(player.roomId);
        if (!room || room.owner_id !== userId) return socket.emit('error', { message: 'Not room owner' });
        roomModel.createInvite(player.roomId, userId, toUserId);
        const targetSocketId = worldState.getSocketIdByUserId(toUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('room:invited', {
                roomId: player.roomId, roomName: room.name, inviterName: username
            });
        }
    });
}

export function getRoomRoutes(router, requireAuth) {
    router.get('/api/rooms/public', requireAuth, (req, res) => {
        const rooms = roomModel.listPublic(20, 0);
        const withCount = rooms.map(r => ({ ...r, playerCount: roomState.getPlayerCount(r.id) }));
        res.json(withCount);
    });

    router.get('/api/rooms/mine', requireAuth, (req, res) => {
        const room = roomModel.getRoomByOwner(req.session.userId);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        res.json(room);
    });

    router.put('/api/rooms/mine', requireAuth, (req, res) => {
        const room = roomModel.getRoomByOwner(req.session.userId);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        const { name, isPublic, theme } = req.body;
        roomModel.updateRoom(room.id, req.session.userId, {
            name: name || room.name,
            isPublic: isPublic !== undefined ? isPublic : room.is_public,
            theme: theme || room.theme
        });
        res.json({ ok: true });
    });

    router.get('/api/rooms/catalog', requireAuth, (req, res) => {
        res.json(roomModel.getCatalog());
    });

    router.post('/api/rooms/invite/accept', requireAuth, (req, res) => {
        const { roomId } = req.body;
        roomModel.acceptInvite(roomId, req.session.userId);
        res.json({ ok: true });
    });
}
