const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

/**
 * GET /api/files - Get all uploaded files
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    
    let queryText = 'SELECT * FROM file_uploads';
    const params = [];
    
    if (status) {
      queryText += ' WHERE status = $1';
      params.push(status);
      queryText += ` ORDER BY uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      queryText += ` ORDER BY uploaded_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * GET /api/files/:id - Get file by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT * FROM file_uploads WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

/**
 * GET /api/files/stats - Get file upload statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_files,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_files,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_files,
        SUM(file_size) as total_size,
        MAX(uploaded_at) as last_upload
      FROM file_uploads
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching file stats:', error);
    res.status(500).json({ error: 'Failed to fetch file statistics' });
  }
});

module.exports = router;



