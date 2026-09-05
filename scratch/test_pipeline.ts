import { evaluateAgentAction } from '../server/policyEngine.ts';
import { processAIChatMessage } from '../server/aiOrchestrator.ts';

async function testAll() {
  console.log("=== POLICY ENGINE CHECK ===");
  try {
    const policyResult = await evaluateAgentAction({
      actorId: 'test_agent',
      actorType: 'AI Agent',
      intent: 'Buy titanium display pro',
      actionType: 'CREATE_ORDER',
      parameters: {
        orderValue: 149999,
        discountAmount: 0
      }
    });
    console.log(JSON.stringify(policyResult, null, 2));
  } catch (e) {
    console.error(e.message);
  }

  console.log("\n=== AI COMPARISON PIPELINE ===");
  try {
    const chatReq = {
      message: "Compare prod-01 and prod-02",
      history: []
    };
    const chatRes = await processAIChatMessage(chatReq);
    console.log(JSON.stringify(chatRes, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

testAll();
