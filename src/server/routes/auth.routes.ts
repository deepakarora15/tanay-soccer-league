import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { verifyPassword, generateToken, hashPassword } from '../auth';
import { createNotification } from '../services/league.service';

const router = Router();

/**
 * POST /login
 * Authenticates a user with email and password.
 * Returns a JWT token and user info on success.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Look up user by email
    const user = db.prepare(
      'SELECT id, email, displayName, passwordHash, role, status FROM User WHERE email = ?'
    ).get(email) as { id: string; email: string; displayName: string; passwordHash: string; role: string; status: string } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check account status
    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account is not active. Please contact an administrator.' });
      return;
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT
    const token = generateToken({ id: user.id, role: user.role, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown' });
  }
});

/**
 * POST /join-request
 * Submits a join request for a new user to the league.
 * Creates a pending user and notifies admins.
 */
router.post('/join-request', async (req: Request, res: Response) => {
  try {
    const { name, email, displayName, password } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required', field: 'name' } });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format', field: 'email' } });
      return;
    }

    // Validate displayName length (3-30 chars)
    if (!displayName || typeof displayName !== 'string' || displayName.length < 3 || displayName.length > 30) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Display name must be between 3 and 30 characters', field: 'displayName' } });
      return;
    }

    // Validate password length (at least 6 chars)
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters', field: 'password' } });
      return;
    }

    // Check if email is already used by a pending or active user
    const existingEmail = db.prepare(
      "SELECT id FROM User WHERE email = ? AND status IN ('pending', 'active')"
    ).get(email) as { id: string } | undefined;

    if (existingEmail) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already in use', field: 'email' } });
      return;
    }

    // Check if displayName is already taken by an active user
    const existingDisplayName = db.prepare(
      "SELECT id FROM User WHERE displayName = ? AND status = 'active'"
    ).get(displayName) as { id: string } | undefined;

    if (existingDisplayName) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Display name unavailable', field: 'displayName' } });
      return;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO User (id, email, displayName, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, email, displayName, passwordHash, 'player', 'pending', now, now);

    // Notify all admins about the new join request
    const admins = db.prepare(
      "SELECT id FROM User WHERE role IN ('admin', 'admin_player') AND status = 'active'"
    ).all() as { id: string }[];

    for (const admin of admins) {
      createNotification(admin.id, 'join_request', `New join request from ${displayName} (${email})`);
    }

    res.status(201).json({ message: 'Account created! You can now log in.', userId });
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
