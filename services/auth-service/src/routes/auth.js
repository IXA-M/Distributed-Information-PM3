const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { publishUserRegistered } = require('../kafka/producer');
const { registerRules, loginRules, handleValidation } = require('../middleware/validate');
const logger = require('../config/logger');

const META = { service: 'auth-service' };

function issueTokens(userId) {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}

// POST /auth/register
router.post('/register', registerRules, handleValidation, async (req, res) => {
  const requestId = uuidv4();
  try {
    const { name, email, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'Email already registered' },
        meta: { ...META, request_id: requestId },
      });
    }

    const user = await User.create({ name, email, password });

    // Hybrid REST + Kafka: respond immediately, profile/role creation happens async
    await publishUserRegistered(user);

    const { accessToken, refreshToken } = issueTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.save({ userId: user.id, token: refreshToken, expiresAt });

    logger.info(`User registered: id=${user.id}`);
    return res.status(201).json({
      success: true,
      data: { user_id: user.id, token: accessToken, refresh_token: refreshToken },
      meta: { ...META, request_id: requestId },
    });
  } catch (err) {
    logger.error('Register error', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' },
      meta: { ...META, request_id: requestId },
    });
  }
});

// POST /auth/login
router.post('/login', loginRules, handleValidation, async (req, res) => {
  const requestId = uuidv4();
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        meta: { ...META, request_id: requestId },
      });
    }

    const valid = await User.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        meta: { ...META, request_id: requestId },
      });
    }

    const { accessToken, refreshToken } = issueTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.save({ userId: user.id, token: refreshToken, expiresAt });

    logger.info(`User logged in: id=${user.id}`);
    return res.json({
      success: true,
      data: { user_id: user.id, token: accessToken, refresh_token: refreshToken },
      meta: { ...META, request_id: requestId },
    });
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
      meta: { ...META, request_id: requestId },
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const requestId = uuidv4();
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'refresh_token is required' },
        meta: { ...META, request_id: requestId },
      });
    }

    const stored = await RefreshToken.findByToken(refresh_token);
    if (!stored) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' },
        meta: { ...META, request_id: requestId },
      });
    }

    // Rotate refresh token
    await RefreshToken.deleteByToken(refresh_token);
    const { accessToken, refreshToken: newRefresh } = issueTokens(stored.user_id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.save({ userId: stored.user_id, token: newRefresh, expiresAt });

    return res.json({
      success: true,
      data: { token: accessToken, refresh_token: newRefresh },
      meta: { ...META, request_id: requestId },
    });
  } catch (err) {
    logger.error('Refresh error', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' },
      meta: { ...META, request_id: requestId },
    });
  }
});

module.exports = router;
