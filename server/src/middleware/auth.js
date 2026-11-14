import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'visioninspect_jwt_secret_production_key_2026';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : (req.cookies && req.cookies.token);

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database
    const userRes = await db.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or session expired.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid or malformed authentication token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access forbidden. Requires one of roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
}
