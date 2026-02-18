export function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Wraps an express middleware for use with Socket.IO
export const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
