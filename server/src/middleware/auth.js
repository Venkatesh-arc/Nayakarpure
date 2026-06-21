import jwt from 'jsonwebtoken';
import config from '../config.js';
import User from '../models/User.js';

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`(?:^|; )${config.auth.cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function authenticate(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded?.id || !decoded?.sessionId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id).select('name email phone role sessionId sessionAgent');
    if (!user || user.sessionId !== decoded.sessionId) {
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    const currentAgent = req.headers['user-agent'] || 'Unknown device';
    if (user.sessionAgent && user.sessionAgent !== currentAgent) {
      return res.status(401).json({ error: 'Session validation failed' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded?.id && decoded?.sessionId) {
        const user = await User.findById(decoded.id).select('name email phone role sessionId sessionAgent');
        const currentAgent = req.headers['user-agent'] || 'Unknown device';
        if (user && user.sessionId === decoded.sessionId && user.sessionAgent === currentAgent) {
          req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
          };
        }
      }
    } catch {
      req.user = null;
    }
  }
  next();
}
