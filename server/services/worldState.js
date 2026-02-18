// In-memory world state — maps socketId -> player data
const players = new Map();
const userToSocket = new Map();

export function addPlayer(socketId, data) {
    players.set(socketId, { ...data, x: 50, z: 50, location: 'plaza', roomId: null });
    userToSocket.set(data.userId, socketId);
}

export function removePlayer(socketId) {
    const p = players.get(socketId);
    if (p) userToSocket.delete(p.userId);
    players.delete(socketId);
}

export function getPlayer(socketId) {
    return players.get(socketId);
}

export function getPlayerByUserId(userId) {
    const socketId = userToSocket.get(userId);
    return socketId ? players.get(socketId) : null;
}

export function getSocketIdByUserId(userId) {
    return userToSocket.get(userId);
}

export function movePlayer(socketId, x, z) {
    const p = players.get(socketId);
    if (p) { p.x = x; p.z = z; }
}

export function setPlayerLocation(socketId, location, roomId = null) {
    const p = players.get(socketId);
    if (p) { p.location = location; p.roomId = roomId; }
}

export function getPlayersInPlaza() {
    return [...players.values()].filter(p => p.location === 'plaza');
}

export function getPlayersInRoom(roomId) {
    return [...players.values()].filter(p => p.location === 'room' && p.roomId === roomId);
}

export function isOnline(userId) {
    return userToSocket.has(userId);
}

export function getAllPlayers() {
    return [...players.values()];
}
