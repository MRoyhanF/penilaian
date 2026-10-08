const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract auth user from Next.js Request or Node req
 * @param {Request|Headers|object} req
 */
function getAuthUser(req) {
  let authHeader = null;

  if (req && typeof req.headers?.get === 'function') {
    // Next.js standard Request or Headers
    authHeader = req.headers.get('authorization');
  } else if (req && req.headers && typeof req.headers === 'object') {
    // Node.js Express / standard req
    authHeader = req.headers.authorization || req.headers.Authorization;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

module.exports = {
  generateToken,
  verifyToken,
  getAuthUser,
};
