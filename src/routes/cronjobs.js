const express = require('express');
const router = express.Router();
const cronjobService = require('../cron/cronjob-service');
const { scheduleJob, stopJob, restartJob } = require('../cron/scheduler');

/**
 * GET /api/cronjobs - Get all cronjobs
 */
router.get('/', async (req, res) => {
  try {
    const cronjobs = await cronjobService.getAllCronjobs();
    res.json(cronjobs);
  } catch (error) {
    console.error('[testing] Error fetching cronjobs:', error);
    res.status(500).json({ error: 'Failed to fetch cronjobs' });
  }
});

/**
 * GET /api/cronjobs/:id - Get cronjob by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cronjob = await cronjobService.getCronjobById(id);
    
    if (!cronjob) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }
    
    res.json(cronjob);
  } catch (error) {
    console.error('[testing] Error fetching cronjob:', error);
    res.status(500).json({ error: 'Failed to fetch cronjob' });
  }
});

/**
 * POST /api/cronjobs - Create new cronjob
 */
router.post('/', async (req, res) => {
  try {
    const { name, schedule, command, enabled } = req.body;
    
    if (!name || !schedule || !command) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, schedule, command' 
      });
    }
    
    const cronjob = await cronjobService.createCronjob({
      name,
      schedule,
      command,
      enabled: enabled !== undefined ? enabled : true,
    });
    
    // Schedule the job if enabled
    if (cronjob.enabled) {
      await scheduleJob(cronjob);
    }
    
    res.status(201).json(cronjob);
  } catch (error) {
    console.error('[testing] Error creating cronjob:', error);
    res.status(500).json({ error: 'Failed to create cronjob' });
  }
});

/**
 * PUT /api/cronjobs/:id - Update cronjob
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const cronjob = await cronjobService.updateCronjob(id, updates);
    
    if (!cronjob) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }
    
    // Restart the job with updated configuration
    await restartJob(cronjob);
    
    res.json(cronjob);
  } catch (error) {
    console.error('[testing] Error updating cronjob:', error);
    res.status(500).json({ error: 'Failed to update cronjob' });
  }
});

/**
 * DELETE /api/cronjobs/:id - Delete cronjob
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Stop the job if it's running
    stopJob(id);
    
    const deleted = await cronjobService.deleteCronjob(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Cronjob not found' });
    }
    
    res.json({ message: 'Cronjob deleted successfully' });
  } catch (error) {
    console.error('[testing] Error deleting cronjob:', error);
    res.status(500).json({ error: 'Failed to delete cronjob' });
  }
});

/**
 * GET /api/cronjobs/:id/executions - Get execution history
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    
    const executions = await cronjobService.getExecutionHistory(id, limit);
    res.json(executions);
  } catch (error) {
    console.error('[testing] Error fetching execution history:', error);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

module.exports = router;


