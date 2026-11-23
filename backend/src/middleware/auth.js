import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { unauthorized, forbidden, wrap } from '../utils/httpError.js';

export const COOKIE_NAME = 'token';

export function issueSession(res, user, remember = false) {
  const days = remember ? config.jwtRememberDays : config.jwtDays;
  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: `${days}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export const clearSession = (res) => res.clearCookie(COOKIE_NAME, { path: '/' });

async function loadUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user || user.status === 'blocked') return null;
  return user;
}

/** کاربر را اگر وارد شده باشد در req.user می‌گذارد، وگرنه ادامه می‌دهد. */
export const optionalAuth = wrap(async (req, _res, next) => {
  req.user = await loadUser(req);
  next();
});

export const requireAuth = wrap(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
});

export const requireRole = (...roles) => [
  requireAuth,
  (req, _res, next) => (roles.includes(req.user.role) ? next() : next(forbidden())),
];

export const requireAdminArea = requireRole('admin', 'expert');
export const requireAdmin = requireRole('admin');
