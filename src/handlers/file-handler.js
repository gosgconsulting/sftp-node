const fs = require('fs').promises;
const path = require('path');
const { query } = require('../db/connection');

/**
 * Process uploaded file
 * @param {string} filePath - Full path to the file
 * @param {number} fileId - Database ID of the file record
 * @returns {Promise<void>}
 */
async function processFile(filePath, fileId) {
  console.log(`[testing] Processing file: ${filePath} (ID: ${fileId})`);

  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  try {
    // Route to specific handler based on file type
    switch (ext) {
      case '.json':
        await handleJsonFile(filePath, fileId);
        break;
      case '.csv':
        await handleCsvFile(filePath, fileId);
        break;
      case '.txt':
        await handleTextFile(filePath, fileId);
        break;
      default:
        await handleGenericFile(filePath, fileId);
        break;
    }

    console.log(`[testing] File processing completed: ${filename}`);
  } catch (error) {
    console.error(`[testing] Error in processFile for ${filename}:`, error);
    throw error;
  }
}

/**
 * Handle JSON files
 * @param {string} filePath - Path to JSON file
 * @param {number} fileId - Database ID
 */
async function handleJsonFile(filePath, fileId) {
  const content = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(content);
  
  const metadata = {
    type: 'json',
    keys: Object.keys(data),
    recordCount: Array.isArray(data) ? data.length : 1,
  };

  await query(
    'UPDATE file_uploads SET metadata = $1 WHERE id = $2',
    [JSON.stringify(metadata), fileId]
  );

  console.log(`[testing] JSON file processed: ${metadata.recordCount} records`);
}

/**
 * Handle CSV files
 * @param {string} filePath - Path to CSV file
 * @param {number} fileId - Database ID
 */
async function handleCsvFile(filePath, fileId) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const metadata = {
    type: 'csv',
    lineCount: lines.length,
    hasHeader: lines.length > 0,
  };

  if (lines.length > 0) {
    metadata.headers = lines[0].split(',').map(h => h.trim());
  }

  await query(
    'UPDATE file_uploads SET metadata = $1 WHERE id = $2',
    [JSON.stringify(metadata), fileId]
  );

  console.log(`[testing] CSV file processed: ${metadata.lineCount} lines`);
}

/**
 * Handle text files
 * @param {string} filePath - Path to text file
 * @param {number} fileId - Database ID
 */
async function handleTextFile(filePath, fileId) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  
  const metadata = {
    type: 'text',
    lineCount: lines.length,
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    charCount: content.length,
  };

  await query(
    'UPDATE file_uploads SET metadata = $1 WHERE id = $2',
    [JSON.stringify(metadata), fileId]
  );

  console.log(`[testing] Text file processed: ${metadata.lineCount} lines`);
}

/**
 * Handle generic/unknown file types
 * @param {string} filePath - Path to file
 * @param {number} fileId - Database ID
 */
async function handleGenericFile(filePath, fileId) {
  const stats = await fs.stat(filePath);
  
  const metadata = {
    type: 'generic',
    processed: true,
  };

  await query(
    'UPDATE file_uploads SET metadata = $1 WHERE id = $2',
    [JSON.stringify(metadata), fileId]
  );

  console.log(`[testing] Generic file processed: ${path.basename(filePath)}`);
}

module.exports = {
  processFile,
};



