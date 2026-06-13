import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// ─── TypeScript augmentation ────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface JwtPayload {
  id: string;
  role: string;
  email: string;
}

// ─── Password utilities ─────────────────────────────────────────────────────

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT utilities ──────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate a signed JWT for a given user payload. Expires in 24 hours.
 */
export function generateToken(user: { id: string; role: string; email: string }): string {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: '24h' }
  );
}

/**
 * Verify a JWT and return the decoded payload, or null if invalid/expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    return { id: decoded.id, role: decoded.role, email: decoded.email };
  } catch {
    return null;
  }
}

// ─── Express middleware ─────────────────────────────────────────────────────

/**
 * Middleware that requires a valid Bearer token in the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware that requires the authenticated user to have 'admin' or 'admin_player' role.
 * Must be used after requireAuth (calls it internally).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || !['admin', 'admin_player'].includes(req.user.role)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

/**
 * Middleware that requires the authenticated user to have 'player' or 'admin_player' role.
 * Must be used after requireAuth (calls it internally).
 */
export function requirePlayer(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || !['player', 'admin_player'].includes(req.user.role)) {
      res.status(403).json({ error: 'Player access required' });
      return;
    }
    next();
  });
}
