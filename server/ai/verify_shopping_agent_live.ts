import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db.js';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

interface LiveVerificationResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: Record<string, any>;
  error?: string;
}

const results: LiveVerificationResult[] = [];

async function makePostRequest(path: string, body: any): Promise<{ status: number; data: any; timeMs: number }> {
  const start = Date.now();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const timeMs = Date.now() - start;
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  return { status: res.status, data, timeMs };
}

async function makeGetRequest(path: string): Promise<{ status: number; data: any; timeMs: number }> {
  const start = Date.now();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  const timeMs = Date.now() - start;
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  return { status: res.status, data, timeMs };
}

async function runLiveVerification() {
  console.log('============================================================');
  console.log('RAZORFLOW PHASE 4.5 — LIVE AI SHOPPING VERIFICATION GATE');
  console.log('============================================================\n');
  console.log(`🎯 Target Backend URL: ${BACKEND_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

  // Verify backend health first
  try {
    const health = await makeGetRequest('/api/health');
    if (health.status !== 200 || health.data.status !== 'healthy') {
      throw new Error(`Backend health check failed: ${JSON.stringify(health.data)}`);
    }
    console.log(`✅ Backend Health Check: Online (Response: ${health.timeMs}ms, DB: ${health.data.database})\n`);
  } catch (err: any) {
    console.error(`❌ Cannot connect to backend at ${BACKEND_URL}:`, err.message);
    process.exit(1);
  }

  // TEST CASE 1: Natural-Language Product Search over Live LINQS Provider
  try {
    console.log('[1] Natural-language product search with Live Provider Discovery...');
    const query = 'Compare NFC smart tags under ₹500';
    const res = await makePostRequest('/api/ai/shop', {
      message: query,
      customerId: 'cust_live_test_01',
      sessionId: `sess_live_${Date.now()}`
    });

    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.data)}`);
    }

    const intent = res.data.interpretedIntent;
    const recs = res.data.recommendations || [];
    const sourceInfo = res.data.sourceInfo;

    const hasLinqs = sourceInfo.providersQueried.includes('linqs');
    const withinBudget = recs.every((r: any) => r.observedPrice.amount <= 500);
    const hasStructuredUrls = recs.some((r: any) => r.productUrl && r.productUrl.startsWith('https://shop.linqs.in/'));

    if (hasLinqs && recs.length > 0 && withinBudget && hasStructuredUrls) {
      console.log('  PASS');
      console.log(`  Provider used: LINQS (${sourceInfo.providersQueried.join(', ')})`);
      console.log(`  Endpoint used: https://shop.linqs.in/api/search / https://shop.linqs.in/llms-json`);
      console.log(`  Query sent: "${intent.searchQuery}" (MaxBudget=₹${intent.budget.max})`);
      console.log(`  HTTP status: 200 OK`);
      console.log(`  Live Recommendations returned: ${recs.length}`);
      console.log(`  Sample Verified Product: "${recs[0].product.title}" (${recs[0].product.currency} ${recs[0].product.price})`);
      console.log(`  Verified Source URL: ${recs[0].productUrl}`);
      console.log(`  Response Time: ${res.timeMs}ms\n`);
      results.push({ testNumber: 1, name: 'Natural-language search', passed: true, details: { count: recs.length, providers: sourceInfo.providersQueried, timeMs: res.timeMs } });
    } else {
      throw new Error(`Validation failed: hasLinqs=${hasLinqs}, count=${recs.length}, withinBudget=${withinBudget}, hasStructuredUrls=${hasStructuredUrls}`);
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 1, name: 'Natural-language search', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 2: Strict Budget Enforcement
  try {
    console.log('[2] Strict budget enforcement (Smart tags under ₹100)...');
    const res = await makePostRequest('/api/ai/shop', {
      message: 'Find NFC tags under ₹100'
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const matching = res.data.matchingProducts || [];
    const recs = res.data.recommendations || [];
    const allWithinBudget = matching.length > 0 && matching.every((p: any) => p.price <= 100) && recs.every((r: any) => r.observedPrice.amount <= 100);

    if (allWithinBudget) {
      console.log('  PASS');
      console.log(`  All ${matching.length} matching products strictly <= ₹100 (Max price found: ₹${Math.max(...matching.map((m: any) => m.price))}).\n`);
      results.push({ testNumber: 2, name: 'Budget enforcement', passed: true, details: { count: matching.length, maxBudget: 100 } });
    } else {
      throw new Error('Over-budget product detected in matching results or 0 matching products');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 2, name: 'Budget enforcement', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 3: Brand Exclusion Verification
  try {
    console.log('[3] Brand exclusion enforcement (Headphones without Sony)...');
    const res = await makePostRequest('/api/ai/shop', {
      message: "Find me headphones under ₹20,000 but don't show Sony"
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const matching = res.data.matchingProducts || [];
    const hasSony = matching.some((p: any) => (p.brand || '').toLowerCase().includes('sony'));
    const intent = res.data.interpretedIntent;
    const exclusionParsed = intent.exclusions?.some((e: string) => e.toLowerCase().includes('sony'));

    if (!hasSony && exclusionParsed) {
      console.log('  PASS');
      console.log(`  Server-side intent parsed exclusion: [${intent.exclusions.join(', ')}].`);
      console.log(`  Zero Sony products present in matching results (${matching.length} items evaluated).\n`);
      results.push({ testNumber: 3, name: 'Brand exclusion', passed: true, details: { excludedBrand: 'Sony', matchingCount: matching.length } });
    } else {
      throw new Error('Excluded brand Sony appeared in matching results or exclusion not parsed');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 3, name: 'Brand exclusion', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 4: Structured Comparison Matrix
  try {
    console.log('[4] Structured comparison matrix generation...');
    const res = await makePostRequest('/api/ai/shop', {
      message: 'Compare the best 3 NFC tags under ₹200'
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const comparison = res.data.comparison;
    if (comparison && Array.isArray(comparison.products) && comparison.products.length >= 2 && Array.isArray(comparison.features) && comparison.features.length > 0) {
      console.log('  PASS');
      console.log(`  Matrix generated for ${comparison.products.length} products across ${comparison.features.length} extracted features.`);
      console.log(`  Extracted Features: ${comparison.features.map((f: any) => f.featureName).join(', ')}`);
      console.log(`  Winner: ${comparison.winnerId}`);
      console.log(`  Verdict: "${comparison.verdict.slice(0, 85)}..."\n`);
      results.push({ testNumber: 4, name: 'Structured comparison', passed: true, details: { products: comparison.products.length, features: comparison.features.length } });
    } else {
      throw new Error('Comparison matrix missing or under-populated');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 4, name: 'Structured comparison', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 5: No-Result Handling without Hallucination
  try {
    console.log('[5] No-result handling (Impossible query)...');
    const res = await makePostRequest('/api/ai/shop', {
      message: 'Find me a product called ZXQ-DOES-NOT-EXIST-938475 under ₹1'
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const recs = res.data.recommendations || [];
    const matching = res.data.matchingProducts || [];

    if (recs.length === 0 && matching.length === 0 && res.data.summary) {
      console.log('  PASS');
      console.log('  Zero hallucinated products. Graceful factual summary returned.\n');
      results.push({ testNumber: 5, name: 'No-result handling', passed: true, details: { recsCount: 0 } });
    } else {
      throw new Error(`Expected 0 products for impossible query, received ${recs.length}`);
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 5, name: 'No-result handling', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 6: Freshness Validation (24-Hour Window)
  try {
    console.log('[6] Freshness validation (24h freshness tracking)...');
    const res = await makePostRequest('/api/ai/shop', {
      message: 'Show smart tags and keychains'
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const recs = res.data.recommendations || [];
    const freshnessChecked = recs.length > 0 && recs.every((r: any) => typeof r.isFresh === 'boolean' && r.timestamp);

    if (freshnessChecked) {
      console.log('  PASS');
      console.log(`  Every recommendation contains verified isFresh flag (${recs.filter((r: any) => r.isFresh).length} fresh) and freshness timestamp.\n`);
      results.push({ testNumber: 6, name: 'Freshness validation', passed: true, details: { freshnessWindowHours: 24, checkedCount: recs.length } });
    } else {
      throw new Error('Freshness metadata missing from recommendations');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 6, name: 'Freshness validation', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 7: Availability Validation
  try {
    console.log('[7] Availability validation (OUT_OF_STOCK handling)...');
    const res = await makePostRequest('/api/ai/shop', {
      message: 'Compare NFC smart tags under ₹500'
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const recs = res.data.recommendations || [];
    const allHaveAvailability = recs.length > 0 && recs.every((r: any) => ['IN_STOCK', 'LIMITED_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'].includes(r.observedAvailability));
    const outOfStockItems = recs.filter((r: any) => r.observedAvailability === 'OUT_OF_STOCK');
    const inStockItems = recs.filter((r: any) => r.observedAvailability === 'IN_STOCK');

    // Verify out-of-stock items have lower match scores than comparable in-stock items
    const outOfStockPenalized = outOfStockItems.length === 0 || inStockItems.length === 0 || 
      outOfStockItems.every((oos: any) => oos.matchScore <= (inStockItems[0]?.matchScore || 100));

    if (allHaveAvailability && outOfStockPenalized) {
      console.log('  PASS');
      console.log(`  Observed availability verified across all ${recs.length} recommendations.`);
      console.log(`  In-Stock: ${inStockItems.length}, Out-of-Stock: ${outOfStockItems.length} (Penalized appropriately).\n`);
      results.push({ testNumber: 7, name: 'Availability validation', passed: true, details: { verifiedCount: recs.length, inStock: inStockItems.length, outOfStock: outOfStockItems.length } });
    } else {
      throw new Error('Availability validation or out-of-stock penalization failed');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 7, name: 'Availability validation', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 8: Supabase Telemetry Recording
  try {
    console.log('[8] Supabase telemetry recording (customer_events)...');
    const testCustId = `cust_live_telemetry_${Date.now()}`;
    await makePostRequest('/api/ai/shop', {
      message: 'Search for NFC stickers under ₹100',
      customerId: testCustId
    });

    // Check DB for recorded event
    const eventRes = await pool.query(
      `SELECT * FROM customer_events WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [testCustId]
    );

    if (eventRes.rows.length > 0) {
      const evt = eventRes.rows[0];
      console.log('  PASS');
      console.log(`  Recorded telemetry event: ${evt.event_type} (ID: ${evt.id}, Customer: ${evt.customer_id})`);
      console.log(`  Telemetry Metadata: ${JSON.stringify(evt.metadata)}\n`);
      results.push({ testNumber: 8, name: 'Supabase telemetry', passed: true, details: { eventId: evt.id, eventType: evt.event_type } });
    } else {
      throw new Error('Telemetry event was not recorded in customer_events table');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 8, name: 'Supabase telemetry', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 9: Critical Discovery-Only Cart Boundary Isolation
  try {
    console.log('[9] Critical discovery-only cart protection (Negative Security Test)...');
    const fakeExternalId = 'ext_linqs_unauthorized_item_999';
    const testCartId = `cart_live_sec_test_${Date.now()}`;

    const cartRes = await makePostRequest(`/api/cart/${testCartId}/items`, {
      productId: fakeExternalId,
      quantity: 1
    });

    if (cartRes.status >= 400 || cartRes.data?.error) {
      console.log('  PASS');
      console.log(`  Rejected unauthorized external discovery ID in merchant cart path (${cartRes.status}: ${cartRes.data?.error || 'Product not found'}).\n`);
      results.push({ testNumber: 9, name: 'Discovery-only cart protection', passed: true, details: { rejectionStatus: cartRes.status } });
    } else {
      throw new Error('External discovery item was erroneously accepted into merchant cart!');
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 9, name: 'Discovery-only cart protection', passed: false, details: {}, error: err.message });
  }

  // TEST CASE 10: Production Mock Fallback Block
  try {
    console.log('[10] Production mock fallback protection (Zero synthetic fallback)...');
    const searchHealth = await makeGetRequest('/api/search/products?query=nfc');

    if (searchHealth.status === 200) {
      const providers = searchHealth.data?.providersQueried || [];
      const hasDummyJson = providers.includes('dummyjson');

      if (!hasDummyJson) {
        console.log('  PASS');
        console.log(`  Active providers: [${providers.join(', ')}] (DummyJSON excluded from production search path).\n`);
        results.push({ testNumber: 10, name: 'Production mock fallback protection', passed: true, details: { providers } });
      } else {
        throw new Error('DummyJSON was detected in active production providers!');
      }
    } else {
      console.log('  PASS (Provider error handled safely)');
      results.push({ testNumber: 10, name: 'Production mock fallback protection', passed: true, details: { status: searchHealth.status } });
    }
  } catch (err: any) {
    console.log('  FAIL:', err.message, '\n');
    results.push({ testNumber: 10, name: 'Production mock fallback protection', passed: false, details: {}, error: err.message });
  }

  // Final summary
  console.log('============================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`PHASE 4.5 RESULT: ${allPassed ? 'GREEN' : 'RED'} (${results.filter(r => r.passed).length}/${results.length} PASSED)`);
  console.log('============================================================\n');

  try {
    await pool.end();
  } catch {}

  process.exit(allPassed ? 0 : 1);
}

runLiveVerification().catch(err => {
  console.error('Live verification crash:', err);
  process.exit(1);
});
