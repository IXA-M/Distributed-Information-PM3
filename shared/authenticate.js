const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const META = { service: 'user-profile-service' };

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Authorization header required' },
      meta: { ...META, request_id: uuidv4() },
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
      meta: { ...META, request_id: uuidv4() },
    });
  }
};
