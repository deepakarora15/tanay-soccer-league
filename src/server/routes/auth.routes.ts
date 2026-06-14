import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from '../db';
import { verifyPassword, generateToken, hashPassword } from '../auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await dbGet(
      'SELECT id, email, displayName, passwordHash, role, status FROM User WHERE email = ?',
      email
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.status === 'rejected') {
      res.status(403).json({ error: 'Your account has been rejected.' });
      return;
    }

    // Auto-activate pending users
    if (user.status === 'pending') {
      await dbRun("UPDATE User SET status = 'active', updatedAt = ? WHERE id = ?", new Date().toISOString(), user.id);
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join-request', async (req: Request, res: Response) => {
  try {
    const { name, email, displayName, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required', field: 'name' } });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format', field: 'email' } });
      return;
    }

    if (!displayName || displayName.length < 3 || displayName.length > 30) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Display name must be 3-30 characters', field: 'displayName' } });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters', field: 'password' } });
      return;
    }

    const existingEmail = await dbGet(
      "SELECT id FROM User WHERE email = ?", email
    );
    if (existingEmail) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already in use', field: 'email' } });
      return;
    }

    const existingName = await dbGet(
      "SELECT id FROM User WHERE displayName = ?", displayName
    );
    if (existingName) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Display name unavailable', field: 'displayName' } });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await dbRun(
      'INSERT INTO User (id, email, displayName, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      userId, email, displayName, passwordHash, 'player', 'active', now, now
    );

    // Auto-login: return token immediately
    const token = generateToken({ id: userId, role: 'player', email });

    res.status(201).json({ message: 'Account created!', userId, token, user: { id: userId, email, displayName, role: 'player' } });
  } catch (error: any) {
    console.error('Join request error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
