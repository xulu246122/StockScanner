import { Router, Request, Response } from 'express';
import { reboundScannerDaemon } from '../services/reboundScannerDaemon.ts';
import { PlungeReboundEngine } from '../quant/rebound/plungeReboundEngine.ts';

export const reboundRouter = Router();

/**
 * GET /api/rebound/config
 * Retrieves the current background daemon configuration and active parameters
 */
reboundRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = reboundScannerDaemon.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve daemon config', details: err.message });
  }
});

/**
 * POST /api/rebound/config
 * Updates daemon configuration, parameters or interval
 */
reboundRouter.post('/config', (req: Request, res: Response) => {
  try {
    const updated = reboundScannerDaemon.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update daemon config', details: err.message });
  }
});

/**
 * POST /api/rebound/config/model
 * Updates or toggles a specific model's parameters and monitoring state
 */
reboundRouter.post('/config/model', (req: Request, res: Response) => {
  try {
    const { modelType, updates } = req.body;
    if (!modelType) {
      return res.status(400).json({ error: 'modelType is required' });
    }
    const updated = reboundScannerDaemon.updateModelConfig(modelType, updates || {});
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update model config', details: err.message });
  }
});

/**
 * POST /api/rebound/config/reset
 * Resets a single model or all models to authoritative commercial defaults
 */
reboundRouter.post('/config/reset', (req: Request, res: Response) => {
  try {
    const { modelType } = req.body || {};
    const updated = reboundScannerDaemon.resetModelToCommercialDefaults(modelType);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset model config', details: err.message });
  }
});

/**
 * GET /api/rebound/candidates
 * Retrieves the latest cached candidate list from background scans
 */
reboundRouter.get('/candidates', (_req: Request, res: Response) => {
  try {
    const config = reboundScannerDaemon.getConfig();
    const candidates = reboundScannerDaemon.getCandidates();
    res.json({
      success: true,
      candidates,
      totalCount: candidates.length,
      lastScannedAt: config.lastScannedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve candidates', details: err.message });
  }
});

/**
 * POST /api/rebound/scan
 * Immediately executes a scan with optional custom parameters
 */
reboundRouter.post('/scan', async (req: Request, res: Response) => {
  try {
    const paramsOverride = req.body && Object.keys(req.body).length > 0 ? req.body : undefined;
    const candidates = await reboundScannerDaemon.executeScan(paramsOverride);
    const config = reboundScannerDaemon.getConfig();
    res.json({
      success: true,
      candidates,
      totalCount: candidates.length,
      lastScannedAt: config.lastScannedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute rebound scan', details: err.message });
  }
});

/**
 * GET /api/rebound/models
 * Returns the 4 authoritative models + custom definition
 */
reboundRouter.get('/models', (_req: Request, res: Response) => {
  try {
    const models = PlungeReboundEngine.getAuthoritativeModels();
    res.json({ success: true, models });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve rebound models', details: err.message });
  }
});

/**
 * GET /api/rebound/events
 * Returns recent high-priority alert events
 */
reboundRouter.get('/events', (_req: Request, res: Response) => {
  try {
    const events = reboundScannerDaemon.getRecentEvents();
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve rebound alert events', details: err.message });
  }
});
