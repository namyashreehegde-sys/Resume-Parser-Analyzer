/**
 * server/ai/index.js
 *
 * Entry point for the AI/analysis layer.
 * The backend team imports this and mounts it with:
 *   app.use('/api/ai', require('./ai/index'))
 */
const express             = require('express');
const analysisRoutes      = require('./routes/analysisRoutes');
const { aiErrorMiddleware } = require('./utils/errorHandler');

const router = express.Router();

// Mount all analysis routes
router.use('/', analysisRoutes);

// AI-specific error handler (must be last in this router)
router.use(aiErrorMiddleware);

module.exports = router;
