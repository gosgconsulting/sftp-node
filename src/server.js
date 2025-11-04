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
 * Wait for database to be available with retries
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delayMs - Delay between retries in milliseconds
 */
async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const testPool = initPool();
      const client = await testPool.connect();
      client.release();
      console.log('[testing] Database connection successful');
      return true;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`[testing] Database not ready, retrying in ${delayMs}ms... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Initialize application
 */
async function initializeApp() {
  try {
    console.log('[testing] Initializing application...');
    console.log('[testing] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET - This will cause connection failure');

    // Wait for database to be available
    console.log('[testing] Waiting for database connection...');
    await waitForDatabase();

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
    console.error('[testing] Error details:', {
      message: error.message,
      code: error.code,
      address: error.address,
      port: error.port,
    });
    
    // If DATABASE_URL is not set, provide helpful error message
    if (!process.env.DATABASE_URL) {
      console.error('[testing] DATABASE_URL environment variable is not set.');
      console.error('[testing] In Railway, make sure you have added a PostgreSQL service and linked it to this service.');
      console.error('[testing] Railway should automatically provide the DATABASE_URL variable.');
    }
    
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

