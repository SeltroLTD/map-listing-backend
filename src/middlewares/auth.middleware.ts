import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import prisma from '../config/prisma';
import { Role } from '../types';
import type { JwtPayload } from '../types';

// Extend Express Request so downstream handlers get typed `req.user`
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

/**
 * authMiddleware
 * Verifies the Bearer token in the Authorization header.
 * Attaches `req.user` on success; returns 401 on failure.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Ensure user still exists in DB (not deleted after token was issued)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * roleMiddleware
 * Must be used AFTER authMiddleware.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export function roleMiddleware(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}
