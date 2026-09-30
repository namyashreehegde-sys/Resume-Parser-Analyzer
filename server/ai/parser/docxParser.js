/**
 * server/ai/parser/docxParser.js
 *
 * Extracts raw text from a DOCX buffer using mammoth.
 * Returns { rawText }.
 * Throws structured errors for empty or invalid files.
 */
const mammoth = require('mammoth');

async function extractDocxText(buffer) {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    const aiErr = new Error('Could not parse the DOCX file. It may be corrupted.');
    aiErr.code  = 'PARSE_FAILURE';
    throw aiErr;
  }

  const rawText = (result.value || '').trim();
  if (!rawText) {
    const aiErr = new Error('The DOCX file contains no extractable text.');
    aiErr.code  = 'EMPTY_RESUME';
    throw aiErr;
  }

  return { rawText };
}

module.exports = { extractDocxText };
