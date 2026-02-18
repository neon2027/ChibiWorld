import { Router } from 'express';
import bcrypt from 'bcrypt';
import { findByUsername, findById, create, updateLastOnline } from '../models/userModel.js';
import { getAvatar } from '../models/avatarModel.js';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-20 alphanumeric characters or underscores' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    if (findByUsername(username)) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const userId = create(username, hash);

    req.session.userId = userId;
    const avatar = getAvatar(userId);
    res.json({ id: userId, username, avatar });
});

authRoutes.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = findByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId = user.id;
    updateLastOnline(user.id);
    const avatar = getAvatar(user.id);
    res.json({ id: user.id, username: user.username, avatar });
});

authRoutes.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

authRoutes.get('/me', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'Not logged in' });
    const user = findById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const avatar = getAvatar(user.id);
    res.json({ id: user.id, username: user.username, avatar });
});
