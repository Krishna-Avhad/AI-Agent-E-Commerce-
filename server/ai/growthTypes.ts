import type { PolicyEvaluationResult } from '../policyEngine.js';

export type OpportunityType =
  | 'ABANDONED_CART'
  | 'UPSELL'
  | 'BUNDLE'
  | 'LOW_CONVERSION'
  | 'INVENTORY'
  | 'REVENUE_DECLINE'
  | 'HIGH_VALUE_CUSTOMER';

export type OpportunityStatus =
  | 'DETECTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED';

export type GrowthActionType =
  | 'CREATE_DISCOUNT'
  | 'CREATE_BUNDLE_RECOMMENDATION'
  | 'ENABLE_UPSELL'
  | 'CREATE_RECOVERY_RECOMMENDATION'
  | 'RESTOCK_ALERT'
  | 'RECOMMENDATION_ONLY';

export interface OpportunityEvidence {
  metric: string;
  observedValue: string | number | boolean | null;
  threshold?: string | number;
  sampleSize?: number;
  dataPoints?: string[];
}

export interface OpportunityRecommendation {
  actionType: GrowthActionType;
  suggestedIncentivePercent?: number;
  suggestedDiscountCode?: string;
  suggestedBundleProductIds?: string[];
  suggestedUpsellProductId?: string;
  explanation: string;
  riskAssessment: 'Low' | 'Medium' | 'High';
  targetAudience?: string;
}

export interface ProjectedImpact {
  projectedRevenueUplift: number;
  projectedAovImpact?: number;
  targetSegmentSize: number;
  recoveryProbability?: number;
  currency: string;
}

export interface ObservedMetric {
  baselineMetric: number;
  postActionMetric?: number;
  observedRevenueImpact?: number;
  observedOrderCount?: number;
  measuredAt?: string;
}

export interface GrowthOpportunity {
  id: string;
  merchantId: string;
  type: OpportunityType;
  title: string;
  summary: string;
  evidence: OpportunityEvidence[];
  recommendation: OpportunityRecommendation;
  projectedImpact: ProjectedImpact;
  observedImpact?: ObservedMetric;
  confidence: number; // 0.0 to 1.0
  priorityScore: number; // 0 to 100
  status: OpportunityStatus;
  policyDecision?: PolicyEvaluationResult;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedBy?: string;
  executedAt?: string;
  auditId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueIntelligenceMetrics {
  totalRevenue: number | null;
  grossOrderValue: number | null;
  averageOrderValue: number | null;
  ordersCount: number;
  paidOrders: number;
  cancelledOrders: number;
  conversionRate: number | null;
  cartAbandonmentRate: number | null;
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }>;
  lowPerformingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  }>;
  inventoryVelocity: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    currentStock: number;
    velocityRatio: number;
    riskStatus: 'CRITICAL_LOW_STOCK' | 'NORMAL' | 'OVERSTOCKED' | 'SLOW_MOVING';
  }>;
  productRevenue: Record<string, number>;
  customerRevenue: Array<{
    customerId: string;
    customerEmail: string;
    totalSpent: number;
    ordersCount: number;
  }>;
}
