import { shoppingAgent } from '../ai/shoppingAgent.js';

async function verifyNLP() {
  console.log('--- STARTING PHASE 2 NLP VERIFICATION ---\n');
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
    // Basic Category & Budget & Currency
    const req1 = await shoppingAgent.processShoppingRequest({ message: 'Find me running shoes under ₹3000' });
    assert(req1.interpretedIntent.category === 'Shoes', 'Gate 2: Category running shoes -> Shoes');
    assert(req1.interpretedIntent.budget.max === 3000, 'Gate 3: Budget max is 3000');
    assert(req1.interpretedIntent.budget.currency === 'INR', 'Gate 3: Currency is INR');
    assert(req1.interpretedIntent.intent === 'product_search', 'Gate 1: Intent is product_search');
    assert(req1.matchingProducts !== undefined && Array.isArray(req1.matchingProducts), 'Gate 14: Real product search returned an array');

    // Brand and Exclusion
    const req2 = await shoppingAgent.processShoppingRequest({ message: 'Find me Nike running shoes under ₹5000, but not Apple' });
    assert(req2.interpretedIntent.brandPreferences.includes('Nike'), 'Gate 4: Brand Nike interpreted');
    assert(req2.interpretedIntent.exclusions.includes('Apple'), 'Gate 5: Exclusion Apple interpreted');

    // Attributes and Quantity
    const req3 = await shoppingAgent.processShoppingRequest({ message: 'I need 3 black wireless headphones' });
    assert(req3.interpretedIntent.quantity === 3, 'Gate 9: Quantity is 3');
    assert(req3.interpretedIntent.requiredSpecs['Color'] === 'Black', 'Gate 6: Color attribute is Black');
    assert(req3.interpretedIntent.requiredSpecs['Connectivity'] === 'Wireless', 'Gate 6: Wireless attribute preserved');

    // Semantic/Occasion Query
    const req4 = await shoppingAgent.processShoppingRequest({ message: 'I need a birthday gift for my sister under ₹2000' });
    assert(req4.interpretedIntent.occasion === 'birthday', 'Gate 7: Occasion is birthday');
    assert(req4.interpretedIntent.recipient === 'sister', 'Gate 7: Recipient is sister');
    assert(req4.interpretedIntent.budget.max === 2000, 'Gate 8: Semantic query retained budget');
    assert(req4.interpretedIntent.intent === 'product_search', 'Gate 7: Intent is product_search (not unknown)');

    // Comparison Intent
    const req5 = await shoppingAgent.processShoppingRequest({ message: 'Compare these two headphones' });
    assert(req5.interpretedIntent.intent === 'comparison' || req5.interpretedIntent.isComparison, 'Gate 10: Comparison intent detected');

    // Ambiguity / Follow Up
    const req6 = await shoppingAgent.processShoppingRequest({ message: 'I need a good one for college' });
    assert(req6.interpretedIntent.intent === 'unknown', 'Gate 12: Ambiguous intent detected as unknown');
    assert(req6.interpretedIntent.followUpRequired === true, 'Gate 12: Follow-up required is true');
    assert(req6.summary === 'What kind of product are you looking for?', 'Gate 12: Summary asks for clarification');

    // Follow-up Context
    const req7 = await shoppingAgent.processShoppingRequest({ 
      message: 'Only black ones', 
      context: { previousIntent: req1.interpretedIntent } 
    });
    assert(req7.interpretedIntent.category === 'Shoes', 'Gate 11: Follow-up context retained category');
    assert(req7.interpretedIntent.budget.max === 3000, 'Gate 11: Follow-up context retained budget');
    assert(req7.interpretedIntent.requiredSpecs['Color'] === 'Black', 'Gate 11: Follow-up added Color black');

    // Adversarial / Malformed input
    const req8 = await shoppingAgent.processShoppingRequest({ message: 'Find under -500 rupees' });
    assert(req8.interpretedIntent.budget.max === undefined, 'Gate 17: Negative budget safely ignored');

    console.log(`\n--- VERIFICATION COMPLETE: ${passed}/${total} PASSED ---`);

    process.exit(passed === total ? 0 : 1);
  } catch (err: any) {
    console.error('FATAL ERROR DURING VERIFICATION:', err);
    process.exit(1);
  }
}

verifyNLP();
