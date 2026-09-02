# RazorFlow AI Commerce: Automated Testing Guide

## Running the Automated Test Suite

To run the complete production backend verification test suite against Supabase PostgreSQL:

```bash
npm test
```

### Verified Test Cases:

1. **Policy Engine — Allow within Bounds**
   - Validates that a 10% discount proposal returns `ALLOW` (`POLICY_CONSTRAINTS_SATISFIED`) and generates an immutable audit record.
2. **Policy Engine — Graceful Failure Path**
   - Validates that an unapproved 25% discount proposal returns `DENY` (`DISCOUNT_PERCENT_EXCEEDED`) and logs a `Blocked` audit entry.
3. **Persistent Cart Engine**
   - Validates atomic database cart item additions, quantity updates, and server-side recalculations.
4. **Server-Side Price Validation & Order Creation**
   - Validates that order items, taxes, shipping, and total amounts are calculated from PostgreSQL catalog prices.
5. **Safe Payment Verification State**
   - Validates that when `PAYMENTS_ENABLED=false`, payment verification returns `PAYMENT_PROVIDER_NOT_CONFIGURED` without fabricating fake IDs.
6. **Webhook Idempotent Event Deduplication**
   - Validates that duplicate deliveries of identical webhook payloads are deduplicated with zero state corruption.
7. **AI Buyer Machine-Readable Catalog Schema**
   - Validates that `GET /api/agent/catalog` adheres to the NPCI UAP/AP2 standard and exposes all 25 hardware SKUs with vector embedding statuses.
8. **AI Growth Engine — Dynamic Upsell Pairings**
   - Validates that graph traversals on `product_relationships` return high-scoring ecosystem pairings.
9. **Server-Side AI Copilot Orchestrator**
   - Validates intent parsing and structured tool action recommendations.

---

## Running TypeScript & Production Build Checks

```bash
# Type check and build
npm run build
```
