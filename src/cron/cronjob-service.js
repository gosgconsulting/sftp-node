const { query } = require('../db/connection');

/**
 * Get all cronjobs
 * @returns {Promise<Array>}
 */
async function getAllCronjobs() {
  const result = await query('SELECT * FROM cronjobs ORDER BY created_at DESC');
  return result.rows;
}

/**
 * Get cronjob by ID
 * @param {number} id - Cronjob ID
 * @returns {Promise<Object|null>}
 */
async function getCronjobById(id) {
  const result = await query('SELECT * FROM cronjobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Create a new cronjob
 * @param {Object} cronjobData - Cronjob data
 * @param {string} cronjobData.name - Cronjob name
 * @param {string} cronjobData.schedule - Cron schedule expression
 * @param {string} cronjobData.command - Command to execute
 * @param {boolean} cronjobData.enabled - Whether cronjob is enabled
 * @returns {Promise<Object>}
 */
async function createCronjob(cronjobData) {
  const { name, schedule, command, enabled = true } = cronjobData;
  
  const result = await query(
    `INSERT INTO cronjobs (name, schedule, command, enabled)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, schedule, command, enabled]
  );
  
  return result.rows[0];
}

/**
 * Update a cronjob
 * @param {number} id - Cronjob ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>}
 */
async function updateCronjob(id, updates) {
  const allowedFields = ['name', 'schedule', 'command', 'enabled'];
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE cronjobs 
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete a cronjob
 * @param {number} id - Cronjob ID
 * @returns {Promise<boolean>}
 */
async function deleteCronjob(id) {
  const result = await query('DELETE FROM cronjobs WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

/**
 * Get enabled cronjobs
 * @returns {Promise<Array>}
 */
async function getEnabledCronjobs() {
  const result = await query(
    'SELECT * FROM cronjobs WHERE enabled = true ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Log cronjob execution
 * @param {number} cronjobId - Cronjob ID
 * @param {string} status - Execution status
 * @param {string} output - Execution output
 * @param {string} errorMessage - Error message if any
 * @returns {Promise<Object>}
 */
async function logExecution(cronjobId, status, output = null, errorMessage = null) {
  const result = await query(
    `INSERT INTO cronjob_executions (cronjob_id, status, output, error_message, completed_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING *`,
    [cronjobId, status, output, errorMessage]
  );
  
  return result.rows[0];
}

/**
 * Get execution history for a cronjob
 * @param {number} cronjobId - Cronjob ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>}
 */
async function getExecutionHistory(cronjobId, limit = 50) {
  const result = await query(
    `SELECT * FROM cronjob_executions 
     WHERE cronjob_id = $1 
     ORDER BY started_at DESC 
     LIMIT $2`,
    [cronjobId, limit]
  );
  
  return result.rows;
}

module.exports = {
  getAllCronjobs,
  getCronjobById,
  createCronjob,
  updateCronjob,
  deleteCronjob,
  getEnabledCronjobs,
  logExecution,
  getExecutionHistory,
};


