/**
 * server/ai/utils/errorHandler.js
 *
 * Structured error codes and an Express error-handling middleware
 * for the AI layer.
 */

const ERROR_CODES = {
  INVALID_FILE:        { status: 400,  message: 'No valid file was uploaded.' },
  UNSUPPORTED_FORMAT:  { status: 415,  message: 'Only PDF and DOCX files are supported.' },
  FILE_TOO_LARGE:      { status: 413,  message: 'File exceeds the 5 MB size limit.' },
  EMPTY_RESUME:        { status: 422,  message: 'The file contains no extractable text.' },
  PARSE_FAILURE:       { status: 422,  message: 'Could not parse the uploaded file.' },
  RESUME_NOT_FOUND:    { status: 404,  message: 'Resume not found.' },
  MATCH_NOT_FOUND:     { status: 404,  message: 'No job matches found for this resume.' },
  DB_ERROR:            { status: 500,  message: 'A database error occurred.' },
  AI_ERROR:            { status: 502,  message: 'The AI service returned an error.' },
  AI_UNAVAILABLE:      { status: 503,  message: 'AI provider is not configured.' },
  VALIDATION_ERROR:    { status: 400,  message: 'Invalid request data.' },
  UNKNOWN_ERROR:       { status: 500,  message: 'An unexpected error occurred.' },
};

/**
 * Create a structured AI error.
 * @param {string} code     — one of ERROR_CODES keys
 * @param {string} [detail] — optional additional detail (server-side only)
 */
function aiError(code, detail) {
  const def     = ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
  const err     = new Error(detail || def.message);
  err.code      = code;
  err.httpStatus = def.status;
  return err;
}

/**
 * Express error middleware for the AI router.
 * Must be registered AFTER all route handlers.
 */
// eslint-disable-next-line no-unused-vars
function aiErrorMiddleware(err, req, res, next) {
  // Map database/connection errors to DB_ERROR
  let code = err.code || 'UNKNOWN_ERROR';
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ER_ACCESS_DENIED_ERROR' ||
      code === 'ER_BAD_DB_ERROR' || err.errno || (err.message && /connect|ECONN|refused/i.test(err.message))) {
    if (!ERROR_CODES[code]) code = 'DB_ERROR';
  }
  if (!ERROR_CODES[code]) code = 'UNKNOWN_ERROR';
  const def    = ERROR_CODES[code];
  const status = err.httpStatus || def.status;

  // Log full error server-side (never expose stack to client)
  console.error(`[AI Error] ${code}: ${err.message}`);
  if (err.stack) console.error(err.stack);

  return res.status(status).json({
    error:     true,
    code,
    message:   def.message,          // safe, user-facing message
    timestamp: new Date().toISOString(),
  });
}

module.exports = { aiError, aiErrorMiddleware, ERROR_CODES };
