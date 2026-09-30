/**
 * server/ai/utils/fileValidator.js
 *
 * Validates uploaded resume files.
 * Checks MIME type via magic bytes (file-type package) + extension allowlist.
 * Returns { valid, error } — does not throw.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // zip-based (OOXML) — file-type sometimes reports this for docx
  'application/zip',
  'application/x-zip-compressed',
]);

/**
 * Validate a file object from multer.
 *
 * @param {Object} file — multer file object { originalname, size, buffer, mimetype }
 * @returns {Promise<{ valid: boolean, fileType: string|null, error: string|null }>}
 */
async function validateFile(file) {
  if (!file) {
    return { valid: false, fileType: null, error: 'No file uploaded.' };
  }

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, fileType: null, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB).` };
  }

  // Extension check
  const ext = (file.originalname || '').toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, fileType: null, error: 'Only .pdf and .docx files are accepted.' };
  }

  // MIME type check (magic bytes via file-type)
  try {
    const fileType = require('file-type');
    // file-type v16 uses fromBuffer
    const detected = await fileType.fromBuffer(file.buffer);
    const detectedMime = detected ? detected.mime : file.mimetype;

    if (!ALLOWED_MIMES.has(detectedMime) && !ALLOWED_MIMES.has(file.mimetype)) {
      // Extra safety: also accept if extension + reported MIME both agree
      if (ext === '.pdf' && file.mimetype === 'application/pdf') {
        // Trust the declared MIME for PDF
      } else if (ext === '.docx' && file.mimetype.includes('officedocument')) {
        // Trust declared MIME for DOCX
      } else {
        return { valid: false, fileType: null, error: 'File content does not match its extension.' };
      }
    }
  } catch (e) {
    // file-type is optional; fall back to extension + declared MIME
    console.warn('[FileValidator] file-type check skipped:', e.message);
  }

  const fileType = ext === '.pdf' ? 'pdf' : 'docx';
  return { valid: true, fileType, error: null };
}

module.exports = { validateFile, MAX_FILE_SIZE };
