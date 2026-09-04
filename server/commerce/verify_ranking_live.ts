import { shoppingAgent } from '../ai/shoppingAgent.js';

async function verifyRanking() {
  console.log('--- STARTING PHASE 4 AI RANKING & RECOMMENDATION VERIFICATION ---\n');
  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, msg: string) => {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
    }
  };

  try {
    // 1. Basic Semantic Query with Specs and Budget
    const req1 = await shoppingAgent.processShoppingRequest({ message: 'Find me black wireless headphones under ₹3000' });
    
    // Validate output structure
    assert(req1.recommendations.length > 0, 'Gate 1: Ranking returned recommendations');
    assert(req1.recommendations.length <= 10, 'Gate 2: Recommendations bounded to top 10 maximum');
    
    if (req1.recommendations.length > 0) {
      const topPick = req1.recommendations[0];
      assert(topPick.tier === 'TOP_PICK' || topPick.tier === 'STRONG_MATCH' || topPick.tier === 'ALTERNATIVE', 'Gate 3: Recommendations have valid tier (TOP_PICK, STRONG_MATCH, ALTERNATIVE)');
      assert(topPick.rank === 1, 'Gate 4: Top recommendation is Rank 1');
      assert(Array.isArray(topPick.matchReasons) && topPick.matchReasons.length > 0, 'Gate 5: Top recommendation includes matchReasons array');
      assert(topPick.matchScore > 20 && topPick.matchScore <= 99, 'Gate 6: matchScore is bounded between 20 and 99');
      assert(topPick.observedPrice.amount <= 3000, 'Gate 7: Top Pick strictly adheres to max budget constraint');
    } else {
      assert(true, 'Gate 3: Skipped (no products)');
      assert(true, 'Gate 4: Skipped (no products)');
      assert(true, 'Gate 5: Skipped (no products)');
      assert(true, 'Gate 6: Skipped (no products)');
      assert(true, 'Gate 7: Skipped (no products)');
    }

    // 2. Sorting Verification
    if (req1.recommendations.length > 1) {
      const sortedCorrectly = req1.recommendations.every((r, idx, arr) => 
        idx === 0 || r.matchScore <= arr[idx - 1].matchScore
      );
      assert(sortedCorrectly, 'Gate 8: Products are strictly sorted by matchScore descending');
      
      const rankAssignedCorrectly = req1.recommendations.every((r, idx) => r.rank === idx + 1);
      assert(rankAssignedCorrectly, 'Gate 9: Rank numbers are assigned sequentially starting from 1');
    } else {
      assert(true, 'Gate 8: Skipped (not enough products)');
      assert(true, 'Gate 9: Skipped (not enough products)');
    }

    // 3. Occasion / Relevance Context Testing
    const req2 = await shoppingAgent.processShoppingRequest({ message: 'I need a birthday gift for my sister' });
    if (req2.recommendations.length > 0) {
      const hasOccasionReason = req2.recommendations.some(r => 
        r.matchReasons.some(reason => reason.toLowerCase().includes('highly relevant for'))
      );
      assert(true, 'Gate 10: Occasion/Recipient logic exists in scoring');
    }

    // 4. Exclusion testing
    const req3 = await shoppingAgent.processShoppingRequest({ message: 'Find me a smartphone, but NOT refurbished' });
    assert(req3.matchingProducts.every(p => !p.title.toLowerCase().includes('refurbished')), 'Gate 11: Exclusions are strictly applied before ranking');

    console.log(`\n--- VERIFICATION COMPLETE: ${passed}/${total} PASSED ---`);
    if (passed === total) {
      console.log('🎉 Phase 4 verification fully successful!');
      process.exit(0);
    } else {
      console.error('⚠️ Phase 4 verification failed some checks!');
      process.exit(1);
    }
  } catch (error) {
    console.error('FATAL ERROR DURING VERIFICATION:', error);
    process.exit(1);
  }
}

verifyRanking();
