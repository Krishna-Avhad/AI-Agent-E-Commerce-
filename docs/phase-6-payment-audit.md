# Phase 6: Razorpay Payment & Lifecycle Audit

## Executive Summary

This audit assesses the baseline payment architecture implemented across Phases 1–5, reviews the database representation, identifies existing strengths, and outlines the precise extensions and security hardenings required for **Phase 6: Real Razorpay Payment Execution & Verified Payment Lifecycle**.

---

## 1. Existing Payment Baseline (Phases 1–5)

### A. Razorpay Order Creation
- **Existing Implementation**: `server/razorpayService.ts` (`createRazorpayOrder`) created an order and simultaneously invoked `razorpayInstance.orders.create({ amount: amountInPaise, currency: 'INR' })`.
- **Phase 6 Requirement**: Separate internal order creation (`POST /api/orders` in Phase 5) from Razorpay payment order generation (`POST /api/payments/order`). The payment service must accept `internalOrderId` as the primary identifier, derive the exact amount in paise strictly from the persistent order, and never trust a client-submitted amount.

### B. Payment Verification
- **Existing Implementation**: `server/razorpayService.ts` (`verifyRazorpayPayment`) compared `crypto.createHmac('sha256', KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')` against `params.razorpaySignature`.
- **Phase 6 Requirement**: 
  1. Use **timing-safe comparison** (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
  2. Verify that the `razorpayOrderId` is strictly bound to the internal order record before transitioning to `PAID`.
  3. Ensure idempotency: repeated verification calls with identical signatures must return the confirmed `PAID` status without duplicate database transitions or audit double-counting.
  4. Ensure order state machine validation: cancelled or fulfilled orders cannot be transitioned to `PAID`.

### C. Webhook Processing
- **Existing Implementation**: `server/razorpayService.ts` (`handleRazorpayWebhook`) validated signature with `WEBHOOK_SECRET`, used an in-memory set and `webhook_events` table for deduplication, and handled `payment.captured`.
- **Phase 6 Requirement**:
  1. Harden timing-safe signature comparison on `x-razorpay-signature`.
  2. Support multiple lifecycle events (`payment.captured`, `payment.failed`, `order.paid`).
  3. Guarantee that duplicate webhook deliveries (2x, 5x) produce zero duplicate side effects and never alter inventory twice.
  4. Handle payment failure events without transitioning orders to `PAID`.

### D. Payment Persistence & Domain Model
- **Existing Implementation**: `payments` table with `id`, `order_id`, `merchant_id`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `status`, `amount`, `currency`, `method`, `verified_at`.
- **Phase 6 Requirement**:
  1. Add unique indices on `payments(merchant_id, razorpay_order_id)` and `payments(merchant_id, razorpay_payment_id)`.
  2. Maintain synchronized payment records in `PaymentRepository.ts` with timeout-protected transactional fallbacks.

### E. Inventory & Order State Machine
- **Existing Phase 5 Implementation**: 
  - `POST /api/orders` reserves inventory atomically (`status: CREATED`, `paymentStatus: PENDING`).
  - `POST /api/orders/:id/cancel` restores reserved inventory units to the `products` table (`status: CANCELLED`).
- **Phase 6 Requirement**:
  - Payment success retains reserved inventory (does NOT deduct a second time).
  - Webhooks and repeated verifications must NOT double-mutate stock.

### F. Security & Secret Protection
- **Rule**: `RAZORPAY_KEY_SECRET` must remain exclusively on the server.
- **Verification**: `RAZORPAY_KEY_SECRET` is present in `.env` for backend runtime and never bundled in Vite client builds (`VITE_*`).

---

## 2. Gap Analysis & Phase 6 Target Architecture

| Component | Phase 1-5 State | Phase 6 Target State |
| :--- | :--- | :--- |
| **Payment Order Input** | `params.items` (raw item payload) | `internalOrderId` (authoritative lookup) |
| **Signature Comparison** | String equality (`===`) | `crypto.timingSafeEqual` |
| **Webhook Events** | `payment.captured` | `payment.captured`, `payment.failed`, `order.paid` |
| **Idempotency** | Memory Set + Webhook Events | Full Order/Payment Idempotency with DB Ledger |
| **Order Binding** | Optional loose binding | Strict `internalOrderId` ↔ `razorpayOrderId` matching |
| **Tenant Isolation** | Basic merchant query filter | Multi-tenant boundary assertion & customer check |
| **Test Coverage** | 9 Phase 1 + 8 Phase 5 tests | 20 Dedicated Phase 6 Payment Lifecycle Tests |

---

## 3. Implementation Roadmap

1. **Database Migration `005_phase6_payment_lifecycle.sql`**: Add unique indices on `payments` and `webhook_events`.
2. **Authoritative `PaymentRepository.ts`**: Expand payment retrieval, capture, and ledger tracking with timeout resilience.
3. **Dedicated `PaymentService.ts`**: Complete server-side payment execution, HMAC timing-safe validation, and webhook dispatch.
4. **Endpoint Hardening in `index.ts`**: Mount `POST /api/payments/order`, `POST /api/payments/verify`, `POST /api/webhooks/razorpay`.
5. **20-Point Test Suite `paymentLifecycle.test.ts`**: Verify all 20 security, lifecycle, and isolation scenarios.
6. **Live Integration Verification `verify_payment_lifecycle_live.ts`**: Test real interaction with Razorpay Test Mode API.
