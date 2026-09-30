/**
 * server/ai/parser/pdfParser.js
 *
 * Extracts raw text from a PDF buffer using pdf-parse.
 * Returns { rawText, pageCount }.
 * Throws structured errors for empty or corrupted files.
 */
const pdfParse = require('pdf-parse');

async function extractPdfText(buffer) {
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (err) {
    const aiErr = new Error('Could not parse the PDF file. It may be corrupted or encrypted.');
    aiErr.code  = 'PARSE_FAILURE';
    throw aiErr;
  }

  const rawText = (data.text || '').trim();
  if (!rawText) {
    const aiErr = new Error('The PDF file contains no extractable text. It may be a scanned image.');
    aiErr.code  = 'EMPTY_RESUME';
    throw aiErr;
  }

  return { rawText, pageCount: data.numpages };
}

module.exports = { extractPdfText };
