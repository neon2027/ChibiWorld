import * as worldState from '../services/worldState.js';

const PLAZA_SIZE = 100;
const MAX_SPEED = 20; // units/sec
const RATE_LIMIT_MS = 60; // min ms between moves (~16Hz max)

export function registerWorldSocket(io, socket) {
    const lastMove = { t: 0 };

    socket.on('plaza:join', () => {
        const player = worldState.getPlayer(socket.id);
        if (!player) return;

        worldState.setPlayerLocation(socket.id, 'plaza');
        socket.join('plaza');

        // Send snapshot of current plaza players
        const others = worldState.getPlayersInPlaza().filter(p => p.socketId !== socket.id && p.userId !== player.userId);
        socket.emit('plaza:snapshot', {
            players: others.map(p => ({
                id: p.userId, username: p.username, x: p.x, z: p.z, avatar: p.avatar
            }))
        });

        // Notify others
        socket.to('plaza').emit('plaza:playerJoined', {
            id: player.userId, username: player.username,
            x: player.x, z: player.z, avatar: player.avatar
        });
    });

    socket.on('plaza:move', ({ x, z, y = 0 }) => {
        const now = Date.now();
        if (now - lastMove.t < RATE_LIMIT_MS) return;
        lastMove.t = now;

        if (typeof x !== 'number' || typeof z !== 'number') return;
        const cx = Math.max(0, Math.min(PLAZA_SIZE, x));
        const cz = Math.max(0, Math.min(PLAZA_SIZE, z));
        const cy = Math.max(0, Math.min(10, typeof y === 'number' ? y : 0));

        worldState.movePlayer(socket.id, cx, cz);
        socket.to('plaza').emit('plaza:playerMoved', { userId: worldState.getPlayer(socket.id)?.userId, x: cx, z: cz, y: cy });
    });

    socket.on('plaza:leave', () => {
        const player = worldState.getPlayer(socket.id);
        if (!player) return;
        socket.leave('plaza');
        socket.to('plaza').emit('plaza:playerLeft', { userId: player.userId });
        worldState.setPlayerLocation(socket.id, 'none');
    });
}
