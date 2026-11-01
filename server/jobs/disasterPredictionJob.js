const disasterPredictionService = require('../services/disasterPredictionService');

let jobIntervalId = null;
let isJobRunning = false;
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Single-instance background worker for disaster prediction
 */
async function runPredictionJob(io) {
  if (isJobRunning) {
    console.log('[PredictionJob] ⏳ Prior evaluation job still executing, skipping cycle.');
    return;
  }

  try {
    isJobRunning = true;
    console.log('[PredictionJob] 🕒 Running scheduled AI disaster prediction cycle...');
    await disasterPredictionService.evaluateAllRegions(io);
  } catch (err) {
    console.error('[PredictionJob] Error during scheduled prediction cycle:', err);
  } finally {
    isJobRunning = false;
  }
}

function startPredictionJob(io, intervalMs = DEFAULT_INTERVAL_MS) {
  if (jobIntervalId) {
    console.log('[PredictionJob] Background worker is already running.');
    return;
  }

  console.log(`[PredictionJob] 🚀 Disaster Prediction background scheduler started (Interval: ${intervalMs / 60000} mins)`);
  
  // Run initial evaluation cycle after a brief 5-second warmup
  setTimeout(() => {
    runPredictionJob(io);
  }, 5000);

  jobIntervalId = setInterval(() => {
    runPredictionJob(io);
  }, intervalMs);
}

function stopPredictionJob() {
  if (jobIntervalId) {
    clearInterval(jobIntervalId);
    jobIntervalId = null;
    console.log('[PredictionJob] 🛑 Disaster Prediction background scheduler stopped.');
  }
}

module.exports = {
  startPredictionJob,
  stopPredictionJob,
  runPredictionJob
};
