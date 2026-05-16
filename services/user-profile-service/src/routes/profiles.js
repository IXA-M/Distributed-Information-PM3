const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Profile = require('../models/Profile');
const authenticate = require('../middleware/authenticate');
const { publishProfileUpdated } = require('../kafka/index');
const logger = require('../config/logger');

const META = { service: 'user-profile-service' };

function validationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
      meta: { ...META, request_id: req.requestId },
    });
    return true;
  }
  return false;
}

// GET /profiles/:id
router.get(
  '/:id',
  authenticate,
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  async (req, res) => {
    if (validationError(req, res)) return;

    const targetId = parseInt(req.params.id);

    // Users may only read their own profile (extend with admin role check if needed)
    if (req.userId !== targetId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only view your own profile' },
        meta: { ...META, request_id: req.requestId },
      });
    }

    try {
      const profile = await Profile.findById(targetId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
          meta: { ...META, request_id: req.requestId },
        });
      }
      return res.json({
        success: true,
        data: profile,
        meta: { ...META, request_id: req.requestId },
      });
    } catch (err) {
      logger.error('GET profile error', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' },
        meta: { ...META, request_id: req.requestId },
      });
    }
  }
);

// PUT /profiles/:id
router.put(
  '/:id',
  authenticate,
  param('id').isInt({ min: 1 }),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('city').optional().isString().trim().isLength({ max: 100 }),
  body('bio').optional().isString().trim().isLength({ max: 500 }),
  async (req, res) => {
    if (validationError(req, res)) return;

    const targetId = parseInt(req.params.id);

    if (req.userId !== targetId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only update your own profile' },
        meta: { ...META, request_id: req.requestId },
      });
    }

    try {
      const { phone, city, bio } = req.body;
      const profile = await Profile.upsert(targetId, { phone, city, bio });

      // Hybrid REST + Kafka: respond immediately, audit/analytics consume async
      await publishProfileUpdated(targetId);

      logger.info(`Profile updated for user_id=${targetId}`);
      return res.json({
        success: true,
        data: profile,
        meta: { ...META, request_id: req.requestId },
      });
    } catch (err) {
      logger.error('PUT profile error', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
        meta: { ...META, request_id: req.requestId },
      });
    }
  }
);

module.exports = router;
