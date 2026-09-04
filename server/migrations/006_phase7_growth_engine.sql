-- ==============================================================================
-- 006_PHASE7_GROWTH_ENGINE.SQL
-- Schema migration for Phase 7 AI Merchant Growth Engine & Revenue Optimization
-- ==============================================================================

-- 1. Create Growth Opportunities Table
CREATE TABLE IF NOT EXISTS growth_opportunities (
  id VARCHAR(100) PRIMARY KEY,
  merchant_id VARCHAR(100) NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  projected_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_impact JSONB DEFAULT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.85,
  priority_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',
  policy_decision JSONB DEFAULT NULL,
  reviewed_by VARCHAR(100) DEFAULT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  approved_by VARCHAR(100) DEFAULT NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  rejected_by VARCHAR(100) DEFAULT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  executed_by VARCHAR(100) DEFAULT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  audit_id VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for fast tenant scoping and status queries
CREATE INDEX IF NOT EXISTS idx_growth_opp_merchant ON growth_opportunities(merchant_id);
CREATE INDEX IF NOT EXISTS idx_growth_opp_status ON growth_opportunities(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_growth_opp_type ON growth_opportunities(merchant_id, type);
CREATE INDEX IF NOT EXISTS idx_growth_opp_priority ON growth_opportunities(merchant_id, priority_score DESC);
