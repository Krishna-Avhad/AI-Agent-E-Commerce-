import { handleAgentActionProposal } from '../server/agentInterface.js';

async function testCheckout() {
  const proposal = {
    action: 'checkout',
    items: [
      { productId: 'prod-01', quantity: 1 } // Wait, I need the actual UUID of Titanium display
    ],
    agentId: 'agent-123',
    merchantId: 'merch_razorflow_01',
    amount: 149999
  };
  
  try {
    const res = await handleAgentActionProposal(proposal);
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e.message);
  }
}
testCheckout();
