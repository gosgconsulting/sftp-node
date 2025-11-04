const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');
const { getEnabledCronjobs, logExecution } = require('./cronjob-service');

const execAsync = promisify(exec);

/**
 * Active cron jobs map
 * @type {Map<number, cron.ScheduledTask>}
 */
const activeJobs = new Map();

/**
 * Initialize and start all enabled cronjobs
 * @returns {Promise<void>}
 */
async function initializeScheduler() {
  console.log('[testing] Initializing cron scheduler...');
  
  const cronjobs = await getEnabledCronjobs();
  
  for (const job of cronjobs) {
    await scheduleJob(job);
  }
  
  console.log(`[testing] Scheduler initialized with ${activeJobs.size} active jobs`);
}

/**
 * Schedule a cronjob
 * @param {Object} cronjob - Cronjob object from database
 * @returns {Promise<void>}
 */
async function scheduleJob(cronjob) {
  const { id, name, schedule, command } = cronjob;

  // Validate cron expression
  if (!cron.validate(schedule)) {
    console.error(`[testing] Invalid cron schedule for job ${name}: ${schedule}`);
    await logExecution(id, 'failed', null, `Invalid cron schedule: ${schedule}`);
    return;
  }

  // Stop existing job if it exists
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
  }

  // Create new scheduled task
  const task = cron.schedule(schedule, async () => {
    console.log(`[testing] Executing cronjob: ${name} (ID: ${id})`);
    
    // Log execution start
    const execution = await logExecution(id, 'running');
    
    try {
      // Execute the command
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const output = stdout || stderr || 'Command executed successfully';
      await logExecution(id, 'completed', output);
      
      console.log(`[testing] Cronjob ${name} completed successfully`);
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      await logExecution(id, 'failed', null, errorMessage);
      
      console.error(`[testing] Cronjob ${name} failed:`, errorMessage);
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  activeJobs.set(id, task);
  console.log(`[testing] Scheduled cronjob: ${name} with schedule: ${schedule}`);
}

/**
 * Stop a scheduled cronjob
 * @param {number} cronjobId - Cronjob ID
 */
function stopJob(cronjobId) {
  if (activeJobs.has(cronjobId)) {
    activeJobs.get(cronjobId).stop();
    activeJobs.delete(cronjobId);
    console.log(`[testing] Stopped cronjob ID: ${cronjobId}`);
  }
}

/**
 * Restart a cronjob (useful after updates)
 * @param {Object} cronjob - Updated cronjob object
 * @returns {Promise<void>}
 */
async function restartJob(cronjob) {
  stopJob(cronjob.id);
  
  if (cronjob.enabled) {
    await scheduleJob(cronjob);
  }
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
  activeJobs.forEach((task, id) => {
    task.stop();
    console.log(`[testing] Stopped cronjob ID: ${id}`);
  });
  activeJobs.clear();
}

module.exports = {
  initializeScheduler,
  scheduleJob,
  stopJob,
  restartJob,
  stopAllJobs,
};

