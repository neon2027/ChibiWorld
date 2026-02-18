import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import { authRoutes } from './server/auth/authRoutes.js';
import { requireAuth } from './server/auth/authMiddleware.js';
import { setupSockets } from './server/sockets/socketManager.js';
import { getChatHistoryRoutes } from './server/sockets/chatSocket.js';
import { getFriendRoutes } from './server/sockets/friendSocket.js';
import { getRoomRoutes } from './server/sockets/roomSocket.js';
import { updateAvatar } from './server/models/avatarModel.js';
import { getRoomByOwner } from './server/models/roomModel.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: false } });

const SQLiteStore = connectSqlite3(session);
const sessionMiddleware = session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
    secret: process.env.SESSION_SECRET || 'chibiworld-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
});

app.use(express.json());
app.use(sessionMiddleware);
app.use(express.static('public'));

// Auth routes
app.use('/api/auth', authRoutes);

// Avatar
app.put('/api/avatar', requireAuth, (req, res) => {
    const { skinTone, hairColor, hairStyle, outfitColor, eyeColor, accessory } = req.body;
    const avatar = updateAvatar(req.session.userId, { skinTone, hairColor, hairStyle, outfitColor, eyeColor, accessory });
    // Broadcast to connected sockets
    io.emit('avatar:update', { userId: req.session.userId, avatar });
    res.json(avatar);
});

// Chat history
getChatHistoryRoutes(app, requireAuth);

// Friends
getFriendRoutes(app, requireAuth);

// Rooms
getRoomRoutes(app, requireAuth);

// Setup Socket.IO
setupSockets(io, sessionMiddleware);

// Init DB and start
initDb();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`\n  ChibiWorld running at http://localhost:${PORT}\n`);
});
