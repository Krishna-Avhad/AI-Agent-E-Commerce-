/**
 * Merchant AI Growth Operations Router (Phase 11)
 * Provides merchant-authenticated endpoints for autonomous growth management,
 * opportunity reviews, action approvals, policy execution, reversibility, and revenue attribution.
 */

import { Router, type Response } from 'express';
import type { AuthenticatedMerchantRequest } from '../merchant/merchantAiRouter.js';
import {
  detectAndAnalyzeOpportunities,
  approveGrowthAction,
  rejectGrowthAction,
  executeGrowthAction,
  rollbackGrowthAction,
  getAutonomyConfig,
  updateAutonomyConfig,
  getRevenueAttribution,
  OPPORTUNITIES_STORE,
  ACTIONS_STORE
} from './growthExecutionService.js';

export const growthOperationsRouter = Router();

/**
 * 1. GET /overview
 * High-level growth operations metrics
 */
growthOperationsRouter.get('/overview', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';

    // Auto-detect fresh opportunities if cache empty
    if (OPPORTUNITIES_STORE.size === 0) {
      await detectAndAnalyzeOpportunities(merchantId);
    }

    const autonomy = getAutonomyConfig(merchantId);
    const attribution = await getRevenueAttribution(merchantId);

    let pendingApprovals = 0;
    let executedCount = 0;
    let policyBlocks = 0;

    for (const action of ACTIONS_STORE.values()) {
      if (action.merchantId === merchantId) {
        if (action.state === 'AWAITING_APPROVAL') pendingApprovals++;
        if (action.state === 'EXECUTED' || action.state === 'MEASURING') executedCount++;
        if (action.state === 'BLOCKED' || action.policyDecision?.decision === 'DENY') policyBlocks++;
      }
    }

    res.json({
      merchantId,
      autonomyMode: autonomy.mode,
      metrics: {
        totalOpportunities: OPPORTUNITIES_STORE.size,
        pendingApprovals,
        actionsExecuted: executedCount,
        policyBlocks,
        actionsExecutedToday: autonomy.actionsExecutedToday,
        dailyActionLimit: autonomy.dailyActionLimit,
        observedRevenue: attribution.totalObservedRevenue,
        projectedRevenueUplift: attribution.projectedRevenueUplift,
        currency: 'INR'
      },
      autonomyConfig: autonomy,
      evaluatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 2. GET /opportunities
 * List detected & analyzed opportunities
 */
growthOperationsRouter.get('/opportunities', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';

    // Refresh opportunities if requested or empty
    if (req.query.refresh === 'true' || OPPORTUNITIES_STORE.size === 0) {
      await detectAndAnalyzeOpportunities(merchantId);
    }

    const merchantOpportunities = Array.from(OPPORTUNITIES_STORE.values()).filter(
      (opp) => opp.merchantId === merchantId
    );

    res.json({
      merchantId,
      total: merchantOpportunities.length,
      opportunities: merchantOpportunities
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 3. GET /opportunities/:id
 * Single opportunity detail
 */
growthOperationsRouter.get('/opportunities/:id', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const opp = OPPORTUNITIES_STORE.get(req.params.id);

    if (!opp || opp.merchantId !== merchantId) {
      return res.status(404).json({
        error: 'OPPORTUNITY_NOT_FOUND',
        message: `Opportunity "${req.params.id}" not found for this merchant.`
      });
    }

    res.json(opp);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 4. POST /actions/:id/approve
 * Approve proposed growth action
 */
growthOperationsRouter.post('/actions/:id/approve', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const approver = (req.body?.approver as string) || 'Merchant Admin';

    const action = await approveGrowthAction(req.params.id, merchantId, approver);
    res.json({
      success: true,
      message: `Growth action "${action.id}" approved successfully.`,
      action
    });
  } catch (err: any) {
    res.status(400).json({ error: 'APPROVAL_FAILED', message: err.message });
  }
});

/**
 * 5. POST /actions/:id/reject
 * Reject proposed growth action
 */
growthOperationsRouter.post('/actions/:id/reject', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const rejector = (req.body?.rejector as string) || 'Merchant Admin';
    const reason = (req.body?.reason as string) || 'Merchant declined proposal';

    const action = await rejectGrowthAction(req.params.id, merchantId, rejector, reason);
    res.json({
      success: true,
      message: `Growth action "${action.id}" rejected.`,
      action
    });
  } catch (err: any) {
    res.status(400).json({ error: 'REJECTION_FAILED', message: err.message });
  }
});

/**
 * 6. POST /actions/:id/execute
 * Execute growth action with idempotency
 */
growthOperationsRouter.post('/actions/:id/execute', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const executor = (req.body?.executor as string) || 'Merchant Operator';
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey;

    const result = await executeGrowthAction(req.params.id, merchantId, executor, idempotencyKey);
    res.json({
      success: true,
      isIdempotentReplay: result.isIdempotentReplay,
      action: result.action
    });
  } catch (err: any) {
    res.status(400).json({ error: 'EXECUTION_FAILED', message: err.message });
  }
});

/**
 * 7. POST /actions/:id/rollback
 * Rollback reversible growth action
 */
growthOperationsRouter.post('/actions/:id/rollback', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const requestor = (req.body?.requestor as string) || 'Merchant Admin';

    const action = await rollbackGrowthAction(req.params.id, merchantId, requestor);
    res.json({
      success: true,
      message: `Growth action "${action.id}" rolled back successfully.`,
      action
    });
  } catch (err: any) {
    res.status(400).json({ error: 'ROLLBACK_FAILED', message: err.message });
  }
});

/**
 * 8. GET /actions
 * List all merchant growth actions
 */
growthOperationsRouter.get('/actions', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const actions = Array.from(ACTIONS_STORE.values()).filter((a) => a.merchantId === merchantId);

    res.json({
      merchantId,
      total: actions.length,
      actions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 9. GET /actions/:id
 * Get single action detail
 */
growthOperationsRouter.get('/actions/:id', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const action = ACTIONS_STORE.get(req.params.id);

    if (!action || action.merchantId !== merchantId) {
      return res.status(404).json({
        error: 'ACTION_NOT_FOUND',
        message: `Growth action "${req.params.id}" not found for this merchant.`
      });
    }

    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 10. GET /automation
 * Get merchant autonomy policy
 */
growthOperationsRouter.get('/automation', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const config = getAutonomyConfig(merchantId);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * 11. PUT /automation
 * Update merchant autonomy policy
 */
growthOperationsRouter.put('/automation', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const updatedBy = (req.body?.updatedBy as string) || 'Merchant Admin';

    const updated = await updateAutonomyConfig(merchantId, req.body, updatedBy);
    res.json({
      success: true,
      message: `Autonomy mode updated to ${updated.mode}`,
      config: updated
    });
  } catch (err: any) {
    res.status(400).json({ error: 'CONFIG_UPDATE_FAILED', message: err.message });
  }
});

/**
 * 12. GET /measurements
 * Conservative revenue attribution breakdown
 */
growthOperationsRouter.get('/measurements', async (req: AuthenticatedMerchantRequest, res: Response) => {
  try {
    const merchantId = req.merchantId || 'merch_razorflow_01';
    const attribution = await getRevenueAttribution(merchantId);
    res.json(attribution);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});
