/**
 * Autonomous AI Revenue Operations Engine — Type Definitions (Phase 11)
 */

import type { PolicyEvaluationResult } from '../policyEngine.js';

export type OpportunityLifecycleState =
  | 'DETECTED'
  | 'ANALYZED'
  | 'PROPOSED'
  | 'POLICY_EVALUATED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'MEASURING'
  | 'OBSERVED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type GrowthActionType =
  | 'RECOVERY_INCENTIVE'
  | 'UPSELL_RECOMMENDATION'
  | 'BUNDLE_RECOMMENDATION'
  | 'DISCOUNT_CAMPAIGN'
  | 'INVENTORY_REBALANCE_ALERT'
  | 'PRICE_OPTIMIZATION_PROPOSAL';

export type AutonomyMode = 'MANUAL' | 'GUARDED_AUTOMATION' | 'AUTONOMOUS';

export interface OpportunityEvidence {
  metric: string;
  observedValue: string | number | boolean | null;
  threshold?: string | number;
  sampleSize?: number;
  dataPoints?: string[];
  explanation: string;
}

export interface GrowthActionParameters {
  discountPercent?: number;
  discountCode?: string;
  cartId?: string;
  customerId?: string;
  productId?: string;
  relatedProductId?: string;
  bundleProductIds?: string[];
  expiresInHours?: number;
  [key: string]: any;
}

export interface ProjectedImpact {
  projectedRevenueUplift: number;
  projectedAovImpact?: number;
  targetSegmentSize: number;
  recoveryProbability?: number;
  currency: string;
}

export interface ObservedImpact {
  baselineRevenue: number;
  observedRevenue: number;
  ordersCount: number;
  measuredAt: string;
  verifiedTransactionIds: string[];
}

export interface GrowthAction {
  id: string;
  merchantId: string;
  opportunityId: string;
  actionType: GrowthActionType;
  title: string;
  target: {
    type: 'CART' | 'PRODUCT' | 'CUSTOMER' | 'CATEGORY' | 'GLOBAL';
    id: string;
    name?: string;
  };
  parameters: GrowthActionParameters;
  projectedImpact: ProjectedImpact;
  observedImpact?: ObservedImpact;
  policyDecision?: PolicyEvaluationResult;
  state: OpportunityLifecycleState;
  isReversible: boolean;
  rollbackState?: 'NOT_APPLICABLE' | 'ROLLBACK_REQUESTED' | 'ROLLED_BACK';
  idempotencyKey: string;
  correlationId: string;
  auditId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedBy?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthOpportunityV2 {
  id: string;
  merchantId: string;
  category: 'ABANDONED_CART' | 'UPSELL' | 'BUNDLE' | 'INVENTORY';
  title: string;
  summary: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  evidence: OpportunityEvidence[];
  proposedAction: GrowthAction;
  state: OpportunityLifecycleState;
  createdAt: string;
  updatedAt: string;
}

export interface AutonomyConfig {
  merchantId: string;
  mode: AutonomyMode;
  allowedActionTypes: GrowthActionType[];
  maxAutomaticDiscount: number; // e.g. 10 (%)
  requireApprovalAboveDiscount: number; // e.g. 10 (%)
  dailyActionLimit: number; // e.g. 20
  actionsExecutedToday: number;
  monetaryExposureLimit: number; // e.g. 50000 (INR)
  updatedBy: string;
  updatedAt: string;
}

export interface RevenueAttributionBreakdown {
  merchantId: string;
  currency: 'INR';
  totalObservedRevenue: number;
  categories: {
    agenticCommerceRevenue: number;
    growthActionInfluencedRevenue: number;
    directAiAssistedRevenue: number;
    standardCommerceRevenue: number;
  };
  projectedRevenueUplift: number;
  attributionMethodology: string;
  calculatedAt: string;
}
