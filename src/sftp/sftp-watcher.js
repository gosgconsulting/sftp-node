const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../db/connection');
const { processFile } = require('../handlers/file-handler');

/**
 * Watch SFTP upload directory for new files
 * @param {string} uploadDir - Directory to watch
 */
function watchSftpDirectory(uploadDir) {
  // SFTP directory watcher started

  const watcher = chokidar.watch(uploadDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 1000
    }
  });

  watcher
    .on('add', async (filePath) => {
      await handleNewFile(filePath);
    })
    .on('error', (error) => {
      console.error('Watcher error:', error);
    });

  return watcher;
}

/**
 * Handle newly uploaded file
 * @param {string} filePath - Full path to the uploaded file
 */
async function handleNewFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const filename = path.basename(filePath);
    
    // Get file info
    const fileInfo = {
      filename,
      file_path: filePath,
      file_size: stats.size,
      mime_type: getMimeType(filePath),
      status: 'pending',
      uploaded_at: new Date(),
    };

    // Insert into database
    const insertQuery = `
      INSERT INTO file_uploads (filename, file_path, file_size, mime_type, status, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await query(insertQuery, [
      fileInfo.filename,
      fileInfo.file_path,
      fileInfo.file_size,
      fileInfo.mime_type,
      fileInfo.status,
      fileInfo.uploaded_at,
    ]);

    const fileId = result.rows[0].id;

    // Process the file
    try {
      await processFile(filePath, fileId);
      
      // Update status to completed
      await query(
        'UPDATE file_uploads SET status = $1, processed_at = $2 WHERE id = $3',
        ['completed', new Date(), fileId]
      );
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      
      // Update status to failed
      await query(
        'UPDATE file_uploads SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, fileId]
      );
    }
  } catch (error) {
    console.error(`Error handling new file ${filePath}:`, error);
  }
}

/**
 * Get MIME type from file extension
 * @param {string} filePath - Path to file
 * @returns {string}
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
  watchSftpDirectory,
};



