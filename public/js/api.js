async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

export const api = {
    register: (username, password) =>
        fetchJSON('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

    login: (username, password) =>
        fetchJSON('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

    logout: () =>
        fetchJSON('/api/auth/logout', { method: 'POST' }),

    me: () =>
        fetchJSON('/api/auth/me').catch(() => null),

    updateAvatar: (avatar) =>
        fetchJSON('/api/avatar', { method: 'PUT', body: JSON.stringify(avatar) }),

    getFriends: () =>
        fetchJSON('/api/friends'),

    getFriendRequests: () =>
        fetchJSON('/api/friends/requests'),

    getChatHistory: () =>
        fetchJSON('/api/chat/history'),

    getWhisperHistory: (userId) =>
        fetchJSON(`/api/chat/whisper/${userId}`),

    getPublicRooms: () =>
        fetchJSON('/api/rooms/public'),

    getMyRoom: () =>
        fetchJSON('/api/rooms/mine'),

    updateMyRoom: (data) =>
        fetchJSON('/api/rooms/mine', { method: 'PUT', body: JSON.stringify(data) }),

    getFurnitureCatalog: () =>
        fetchJSON('/api/rooms/catalog'),

    acceptRoomInvite: (roomId) =>
        fetchJSON('/api/rooms/invite/accept', { method: 'POST', body: JSON.stringify({ roomId }) })
};
