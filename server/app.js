const express = require('express');
const cors = require('cors');
const path = require('path');

const aiRouter = require('./ai/index');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'resume-parser-backend' }));

// ── AI / Analysis routes ────────────────────────────────────────────────────
app.use('/api/ai', aiRouter);

// ── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({
    error: true,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
