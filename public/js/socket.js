let _socket = null;

export function initSocket() {
    if (_socket) return _socket;
    _socket = io({ autoConnect: true });
    _socket.on('connect_error', (err) => {
        console.warn('[Socket] connect error:', err.message);
    });
    return _socket;
}

export function getSocket() {
    return _socket;
}

export function disconnectSocket() {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }
}
