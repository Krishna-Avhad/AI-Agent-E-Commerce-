# ⚡ RazorFlow AI Commerce

> **Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce**  
> *"Grow the merchant's revenue, and make them sellable to AI buyers."*

---

## 🚀 Key Highlights

1. **Deterministic Agent Policy Engine (`server/policyEngine.ts`)**: Strict separation where AI models may only propose actions while deterministic server code enforces merchant-configured discount caps (15%), single-order limits (₹50,000), and payment confirmation gates.
2. **Graceful Failure Demonstration**: Proposing an out-of-bounds 25% discount triggers `DENY` (`DISCOUNT_PERCENT_EXCEEDED`), logs an immutable audit trail entry, and gracefully falls back to the verified allowable 10% coupon (`RAZORFLOW10`).
3. **Zero-Trust Price Recalculation**: Prices, taxes, and shipping are always recomputed server-side from Supabase PostgreSQL.
4. **Server-Side Razorpay Test Mode Adapter**: Supports `PAYMENTS_ENABLED=false` (safe unconfigured state with zero fabricated fake IDs) and seamless transition to Razorpay Test Mode with HMAC-SHA256 signature verification and idempotent webhooks once credentials are added.
5. **AI Growth & Cross-Sell Engine**: Relational graph traversing `product_relationships` to generate high-affinity hardware pairings.
6. **NPCI UAP / AP2 Machine-Readable Catalog**: Machine-to-machine endpoints (`/api/agent/*`) enabling autonomous procurement agents to discover, negotiate, and transact.
7. **25-Table Supabase PostgreSQL Foundation**: Full Row Level Security (RLS) enabled across all 25 tables.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Seed Database & Run Verification Tests
```bash
# Run the 9-test production verification suite
npm test
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API Server
npm run server

# Terminal 2: Frontend App
npm run dev
```

---

## 🧪 Automated Test Results (`npm test`)

```text
🧪 RAZORFLOW AI COMMERCE: PRODUCTION BACKEND & TRACK 01 VERIFICATION SUITE

Test 1: Policy Engine - Allowed 10% Discount Proposal...
  ✅ PASSED: Decision = ALLOW, Audit ID = AUD-1788327502381-8988

Test 2: Policy Engine - Graceful Failure on 25% Discount Proposal...
  ✅ PASSED: Decision = DENY, Reason = Proposed discount of 25% exceeds the merchant maximum allowable discount cap of 15%.
  ✅ PASSED: Immutable Audit Record logged = AUD-1788327502822-7737

Test 3: Persistent Cart Engine with Server-Side Recalculation...
  ✅ PASSED: Cart cart_test_1788327503080 persisted with subtotal ₹698, total ₹703.84

Test 4: Server-Side Price Validation & Order Creation...
  ✅ PASSED: Order created: ORD-1788327507066-7444, Total: ₹581.04, Provider Configured: false

Test 5: Safe Payment Verification State...
  ✅ PASSED: Verification safely returned PAYMENT_PROVIDER_NOT_CONFIGURED without fabricating success.

Test 6: Webhook Idempotent Event Deduplication...
  ✅ PASSED: First delivery processed; second duplicate delivery deduplicated with 0 state corruption.

Test 7: AI Buyer Machine-Readable Catalog Endpoint (UAP/ACP Protocol)...
  ✅ PASSED: Protocol Version = UAP-ACP/2.4, SKUs Available = 25

Test 8: AI Growth Engine - Dynamic Upsell Pairings from Relational Graph...
  ✅ PASSED: Retrieved 3 pairings (Top pairing: SonicDAC Pro Audiophile USB-C Amp, Score: 0.96)

Test 9: Server-Side AI Copilot Orchestrator Intent Routing...
  ✅ PASSED: Assistant replied with 3 actionable tool recommendations.

==============================================================================
🎉 TEST SUMMARY: 9 PASSED | 0 FAILED
==============================================================================
```

---

## 🔗 Project Links
- **GitHub Repository**: [https://github.com/Krishna-Avhad/AI-Agent-E-Commerce-](https://github.com/Krishna-Avhad/AI-Agent-E-Commerce-)
- **Frontend URL**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
