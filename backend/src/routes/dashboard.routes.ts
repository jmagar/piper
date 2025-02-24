import os from 'os';

import { Router } from 'express';

declare global {
  var requestCount: number;
  var activeConnections: number;
  var lastError: { message: string; timestamp: Date } | null;
}

const router = Router();

/**
 * GET /dashboard/stats
 * Returns various server statistics and metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      uptime: process.uptime(),
      totalRequests: global.requestCount || 0,
      activeConnections: global.activeConnections || 0,
      memoryUsage: process.memoryUsage(),
      systemLoad: os.loadavg(),
      cpuUsage: process.cpuUsage(),
      lastError: global.lastError || null
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting server stats:', error);
    res.status(500).json({ error: 'Failed to get server stats' });
  }
});

export default router; 