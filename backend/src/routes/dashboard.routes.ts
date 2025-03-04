import express from 'express';
import { DashboardService } from '../services/dashboard/dashboard.service.js';

const router = express.Router();

/**
 * GET /api/dashboard/summary
 * Get dashboard summary
 */
router.get('/summary', async (req, res, next) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;

    const summary = await DashboardService.getDashboardSummary(userId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/documents
 * Get document statistics
 */
router.get('/documents', async (req, res, next) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;
    const { limit, offset } = req.query;

    const stats = await DashboardService.getDocumentStats({
      userId,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/mcp-servers
 * Get MCP server statistics
 */
router.get('/mcp-servers', async (_req, res, next) => {
  try {
    const stats = await DashboardService.getMcpServerStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/alerts
 * Get alerts
 */
router.get('/alerts', async (req, res, next) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;
    const { read, type, limit, offset } = req.query;

    const alerts = await DashboardService.getAlerts({
      userId,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type: type as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dashboard/alerts/:id/read
 * Mark an alert as read
 */
router.post('/alerts/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await DashboardService.markAlertAsRead(id);
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/dashboard/alerts/:id
 * Delete an alert
 */
router.delete('/alerts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await DashboardService.deleteAlert(id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/activity
 * Get user activity log
 */
router.get('/activity', async (req, res, next) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers['x-user-id'] as string;
    const { type, startDate, endDate, limit, offset } = req.query;

    const activityLog = await DashboardService.getActivityLog({
      userId,
      type: type as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(activityLog);
  } catch (error) {
    next(error);
  }
});

export default router; 