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
    const dbUrl = connectionString || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure it in Railway.');
    }
    
    // Database connection initialized
    
    pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
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
  try {
    const res = await dbPool.query(text, params);
    return res;
  } catch (error) {
    // Only log non-expected errors (not schema initialization duplicates)
    if (error.code !== '42P07' && error.code !== '42P01') {
      console.error('Database query error:', error.message);
    }
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
  
  // Remove comments and split into statements
  const statements = schema
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Separate CREATE TABLE and CREATE INDEX statements
  const createTableStatements = [];
  const createIndexStatements = [];
  
  for (const statement of statements) {
    const upper = statement.toUpperCase();
    if (upper.startsWith('CREATE TABLE')) {
      createTableStatements.push(statement);
    } else if (upper.startsWith('CREATE INDEX')) {
      createIndexStatements.push(statement);
    } else {
      // Other statements (like ALTER TABLE, etc.)
      createTableStatements.push(statement);
    }
  }
  
  // First, create all tables
  for (const statement of createTableStatements) {
    try {
      await query(statement);
    } catch (error) {
      // If table already exists, that's okay (CREATE TABLE IF NOT EXISTS)
      if (error.code !== '42P07') {
        console.error(`Error creating table: ${error.message}`);
        throw error;
      }
    }
  }
  
  // Then, create all indexes
  for (const statement of createIndexStatements) {
    try {
      await query(statement);
    } catch (error) {
      // If index already exists or table doesn't exist yet, that's okay
      if (error.code !== '42P07' && error.code !== '42P01') {
        console.error(`Error creating index: ${error.message}`);
        throw error;
      }
    }
  }
}

module.exports = {
  initPool,
  getPool,
  query,
  initSchema,
};

