# RazorFlow AI Commerce: Payment Architecture & Lifecycle

## 1. Zero-Trust Price Recalculation Flow

```
Shopper / AI Agent
       │
       │ POST /api/payments/create-order (items, customer details)
       ▼
Express API Gateway
       │
       │ 1. Resolve Product IDs in Supabase
       │ 2. Fetch verified unit prices from PostgreSQL
       │ 3. Compute Subtotal = sum(unit_price * quantity)
       │ 4. Compute Tax (8%) & Shipping
       │ 5. Validate Promotional Discount via Policy Engine
       │ 6. Final Amount (INR) = Subtotal - Discount + Tax + Shipping
       ▼
Deterministic Policy Gate
       │
       │ Check single order value <= agent_max_order_value (₹50,000)
       ▼
Razorpay Test Mode Adapter
       │
       ├─ If PAYMENTS_ENABLED=true & Credentials Present:
       │    Calls razorpay.orders.create({ amount: finalAmount * 100, currency: 'INR' })
       │    Returns { razorpayOrderId: "order_...", paymentProviderConfigured: true }
       │
       └─ If PAYMENTS_ENABLED=false or Credentials Missing:
            Safely persists Order in Supabase with status PAYMENT_PENDING
            Returns { paymentProviderConfigured: false, message: "PAYMENT_PROVIDER_NOT_CONFIGURED" }
            (Zero fabricated success or fake IDs)
```

---

## 2. Server-Side Cryptographic Verification Flow

```
Client Checkout Callback
       │
       │ POST /api/payments/verify { razorpayOrderId, razorpayPaymentId, razorpaySignature }
       ▼
Server Signature Validator
       │
       │ generatedSignature = crypto.createHmac('sha256', KEY_SECRET)
       │                             .update(`${razorpayOrderId}|${razorpayPaymentId}`)
       │                             .digest('hex');
       │
       ├─ If signature === generatedSignature:
       │    UPDATE orders SET status = 'PAID', payment_status = 'PAID'
       │    UPDATE payments SET status = 'CAPTURED', razorpay_signature = ...
       │    Write immutable 5W1H audit log (status: Success)
       │    Return { verified: true, status: 'PAID' }
       │
       └─ If signature mismatch:
            Write security alert to audit_logs (status: Blocked, risk: High)
            Return { verified: false, message: 'Invalid payment signature.' }
```

---

## 3. Idempotent Webhook Processing Flow

```
Incoming Webhook POST /api/webhooks/razorpay
       │
       │ 1. Verify X-Razorpay-Signature header against WEBHOOK_SECRET
       │ 2. Compute SHA-256 hash of raw JSON body
       │ 3. SELECT * FROM webhook_events WHERE event_id = event.id
       │
       ├─ If already processed:
       │    Return 200 { status: 'already_processed' } (Zero duplicate state execution)
       │
       └─ If new event:
            INSERT INTO webhook_events (event_id, payload, payload_hash, signature_verified, processed)
            Execute event actions (e.g. mark order paid on payment.captured)
            Return 200 { status: 'processed' }
```
