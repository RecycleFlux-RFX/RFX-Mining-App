// runner.js - Plug-and-play Free Tier Runner Manager for RFX
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ==========================
// CONFIG
// ==========================
const MAX_RUNNERS = parseInt(process.env.MAX_RUNNERS || '5', 10);
const MAX_POOL_SIZE = parseInt(process.env.MAX_POOL_SIZE || '10', 10);
const IDLE_TIMEOUT_MINUTES = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30', 10);
const TASK_TIMEOUT_MS = parseInt(process.env.TASK_MAX_EXECUTION_MS || '30000', 10);

// ==========================
// GET CLUSTER URIS FROM .ENV
// ==========================
function getClusterUris() {
  const uris = [];
  const max = parseInt(process.env.MAX_CLUSTERS || '1', 10);
  for (let i = 0; i < max; i++) {
    const uri = process.env[`MONGO_URI_${i}`];
    if (uri) uris.push(uri);
  }
  return uris;
}
const CLUSTER_URIS = getClusterUris();

// ==========================
// RUNNER CLASS
// ==========================
class FreeTierRunner {
  constructor(clusterId) {
    this.id = uuidv4();
    this.clusterId = clusterId;
    this.connection = null;
    this.lastUsed = Date.now();
    this.usageStats = { queries: 0, dataProcessed: 0, errors: 0 };
    this.activeTasks = new Map();
    this.uri = CLUSTER_URIS[clusterId];
    if (!this.uri) throw new Error(`No MongoDB URI found for clusterId ${clusterId}`);
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await mongoose.createConnection(this.uri, {
          maxPoolSize: MAX_POOL_SIZE,
          serverSelectionTimeoutMS: 5000
        });
        console.log(`[Runner:${this.clusterId}] Connected`);
      } catch (err) {
        console.error(`[Runner:${this.clusterId}] Connection error:`, err.message);
        this.usageStats.errors++;
      }
    }
  }

  async runTask(taskId, taskFn) {
    const start = Date.now();
    this.lastUsed = Date.now();

    const timeout = setTimeout(() => {
      console.warn(`[Runner:${this.clusterId}] Task ${taskId} timed out`);
      this.usageStats.errors++;
      this.activeTasks.delete(taskId);
    }, TASK_TIMEOUT_MS);

    try {
      this.activeTasks.set(taskId, true);
      await this.connect();
      const result = await taskFn(this.connection);
      this.usageStats.queries++;
      console.log(`[Runner:${this.clusterId}] Task ${taskId} done in ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      console.error(`[Runner:${this.clusterId}] Task error:`, err.message);
      this.usageStats.errors++;
    } finally {
      clearTimeout(timeout);
      this.activeTasks.delete(taskId);
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
      console.log(`[Runner:${this.clusterId}] Disconnected`);
      this.connection = null;
    }
  }

  isIdle() {
    return Date.now() - this.lastUsed > IDLE_TIMEOUT_MINUTES * 60 * 1000 && this.activeTasks.size === 0;
  }
}

// ==========================
// MANAGER CLASS
// ==========================
class RunnerManager {
  constructor() {
    this.runners = [];
  }

  getAvailableRunner() {
    return this.runners.find(r => r.activeTasks.size < MAX_POOL_SIZE) || null;
  }

  async createRunner(clusterId) {
    if (this.runners.length >= MAX_RUNNERS) {
      throw new Error(`Max runners reached (${MAX_RUNNERS})`);
    }
    const runner = new FreeTierRunner(clusterId);
    await runner.connect();
    this.runners.push(runner);
    return runner;
  }

  async execute(clusterId, taskFn) {
    let runner = this.getAvailableRunner();
    if (!runner) {
      runner = await this.createRunner(clusterId);
    }
    return runner.runTask(uuidv4(), taskFn);
  }

  async cleanupIdle() {
    for (const runner of [...this.runners]) {
      if (runner.isIdle()) {
        await runner.disconnect();
        this.runners = this.runners.filter(r => r !== runner);
      }
    }
  }

  logStats() {
    console.log('--- Runner Stats ---');
    this.runners.forEach(r => console.log(`Cluster ${r.clusterId}:`, r.usageStats));
  }
}

const manager = new RunnerManager();

// ==========================
// AUTO-INIT ON IMPORT
// ==========================
(async () => {
  console.log('RunnerManager starting...');

  // Maintenance every 15 min
  cron.schedule('*/15 * * * *', async () => {
    await manager.cleanupIdle();
    manager.logStats();
  });

  // Keep-alive ping (Render/Vercel)
  if (process.env.RENDER_EXTERNAL_URL) {
    cron.schedule('*/5 * * * *', async () => {
      try {
        await axios.get(`${process.env.RENDER_EXTERNAL_URL}/ping-server`);
        console.log('Ping OK');
      } catch (err) {
        console.error('Ping failed:', err.message);
      }
    });
  }
})();

module.exports = manager;
