require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initPool, initSchema } = require('./db/connection');
const { watchSftpDirectory } = require('./sftp/sftp-watcher');
const { initializeScheduler } = require('./cron/scheduler');
const cronjobsRouter = require('./routes/cronjobs');
const filesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;
const SFTP_UPLOAD_DIR = process.env.SFTP_UPLOAD_DIR || '/home/sftpuser/uploads';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for UI
app.use(express.static(path.join(__dirname, '../ui/public')));

// API Routes
app.use('/api/cronjobs', cronjobsRouter);
app.use('/api/files', filesRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/public/index.html'));
});

/**
 * Initialize application
 */
async function initializeApp() {
  try {
    console.log('[testing] Initializing application...');

    // Initialize database connection
    console.log('[testing] Connecting to database...');
    initPool(process.env.DATABASE_URL);
    
    // Initialize database schema
    console.log('[testing] Initializing database schema...');
    await initSchema();

    // Ensure upload directory exists
    const fs = require('fs');
    if (!fs.existsSync(SFTP_UPLOAD_DIR)) {
      fs.mkdirSync(SFTP_UPLOAD_DIR, { recursive: true });
      console.log(`[testing] Created upload directory: ${SFTP_UPLOAD_DIR}`);
    }

    // Start SFTP directory watcher
    console.log('[testing] Starting SFTP directory watcher...');
    watchSftpDirectory(SFTP_UPLOAD_DIR);

    // Initialize cron scheduler
    console.log('[testing] Initializing cron scheduler...');
    await initializeScheduler();

    // Start server
    app.listen(PORT, () => {
      console.log(`[testing] Server running on port ${PORT}`);
      console.log(`[testing] Web UI available at http://localhost:${PORT}`);
      console.log(`[testing] API available at http://localhost:${PORT}/api`);
      console.log(`[testing] Watching SFTP directory: ${SFTP_UPLOAD_DIR}`);
    });
  } catch (error) {
    console.error('[testing] Failed to initialize application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[testing] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[testing] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the application
initializeApp();

