const { Pool } = require('pg');

/**
 * Database connection pool
 * @type {Pool}
 */
let pool = null;

/**
 * Initialize database connection pool
 * @param {string} connectionString - PostgreSQL connection string
 * @returns {Pool}
 */
function initPool(connectionString) {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('[testing] Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

/**
 * Get database connection pool
 * @returns {Pool}
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>}
 */
async function query(text, params) {
  const dbPool = getPool();
  const start = Date.now();
  try {
    const res = await dbPool.query(text, params);
    const duration = Date.now() - start;
    console.log('[testing] Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[testing] Query error', { text, error: error.message });
    throw error;
  }
}

/**
 * Initialize database schema
 * @returns {Promise<void>}
 */
async function initSchema() {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split by semicolon and execute each statement separately
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.trim()) {
      await query(statement);
    }
  }
  
  console.log('[testing] Database schema initialized');
}

module.exports = {
  initPool,
  getPool,
  query,
  initSchema,
};

