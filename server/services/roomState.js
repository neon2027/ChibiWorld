// Track active rooms (currently visited), mainly for player count
const activeRooms = new Map(); // roomId -> Set of userIds

export function playerEnterRoom(roomId, userId) {
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Set());
    activeRooms.get(roomId).add(userId);
}

export function playerLeaveRoom(roomId, userId) {
    const set = activeRooms.get(roomId);
    if (set) {
        set.delete(userId);
        if (set.size === 0) activeRooms.delete(roomId);
    }
}

export function getPlayerCount(roomId) {
    return activeRooms.get(roomId)?.size ?? 0;
}
