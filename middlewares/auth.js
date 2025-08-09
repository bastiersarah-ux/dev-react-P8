const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';

function authenticate(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const [scheme, token] = auth.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.id, role: payload.role, name: payload.name, email: payload.email };
    } catch (e) {
      // invalid token -> ignore for authenticate(), but requireAuth will block
    }
  }
  next();
}

function requireAuth(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'authentication required' });
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin required' });
    next();
  });
}

module.exports = { authenticate, requireAuth, requireAdmin };
