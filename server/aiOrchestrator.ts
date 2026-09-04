import { pool } from './db.js';
import { evaluateAgentAction } from './policyEngine.js';
import { getDynamicUpsellCrossSell } from './growthEngine.js';

export interface ChatMessageRequest {
  sessionId?: string;
  customerId?: string;
  message: string;
}

export interface ChatActionOption {
  label: string;
  actionType: string;
  payload: any;
}

export interface ChatMessageResponse {
  sessionId: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatActionOption[];
  policyEvaluation?: any;
}

export async function processAIChatMessage(req: ChatMessageRequest): Promise<ChatMessageResponse> {
  const sessionId = req.sessionId || `sess_${Date.now()}`;
  const text = req.message.toLowerCase().trim();

  // 1. Ensure AI Session exists in Database
  try {
    await Promise.race([
      pool.query(
        `INSERT INTO ai_sessions (id, merchant_id, customer_id, channel, status)
         VALUES ($1, 'merch_razorflow_01', $2, 'AI_COPILOT', 'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [sessionId, req.customerId || null]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);

    // 2. Log User Message to Database
    const userMsgId = `msg_${Date.now()}_u`;
    await Promise.race([
      pool.query(
        `INSERT INTO ai_messages (id, session_id, role, sender, content, created_at)
         VALUES ($1, $2, 'user', 'user', $3, NOW())`,
        [userMsgId, sessionId, req.message]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);
  } catch {}

  let assistantReply = '';
  let actions: ChatActionOption[] = [];
  let policyResult: any = null;

  // 3. Natural Language Intent Routing & Deterministic Backend Service Execution
  if (text.includes('discount') || text.includes('coupon') || text.includes('offer') || text.includes('deal')) {
    // Check if user is asking for large unapproved discount
    if (text.includes('25') || text.includes('30') || text.includes('50')) {
      const evalRes = await evaluateAgentAction({
        actorId: 'AI-Copilot-01',
        actorType: 'AI Agent',
        intent: 'Customer requested 25% discount',
        actionType: 'APPLY_DISCOUNT',
        parameters: { discountPercent: 25, cartTotal: 499 }
      });
      policyResult = evalRes;
      assistantReply = `I cannot authorize a 25% discount as it exceeds our merchant maximum discount boundary of 15% (Policy reason: ${evalRes.reasonCode}). However, I can offer you our verified 10% instant promo code **RAZORFLOW10**!`;
      actions = [
        { label: '🎟️ Apply 10% Code RAZORFLOW10', actionType: 'apply_coupon', payload: 'RAZORFLOW10' }
      ];
    } else {
      assistantReply = `I can apply our merchant-verified 10% promotional coupon **RAZORFLOW10** to your cart right now!`;
      actions = [
        { label: '🎟️ Apply 10% Code RAZORFLOW10', actionType: 'apply_coupon', payload: 'RAZORFLOW10' }
      ];
    }
  } else if (text.includes('headphone') || text.includes('audio') || text.includes('mic') || text.includes('sound')) {
    const prodRes = await pool.query(
      "SELECT * FROM products WHERE category = 'Audio' ORDER BY rating DESC LIMIT 3"
    );
    assistantReply = `Found top studio acoustic hardware in our catalog: **${prodRes.rows[0].name}** (₹${prodRes.rows[0].price}) with ${prodRes.rows[0].ai_match_score}% AI match score.`;
    actions = prodRes.rows.map((p) => ({
      label: `🎧 View ${p.name} (₹${p.price})`,
      actionType: 'view_product',
      payload: p
    }));
  } else if (text.includes('keyboard') || text.includes('mouse') || text.includes('ergo') || text.includes('typing')) {
    const prodRes = await pool.query(
      "SELECT * FROM products WHERE category = 'Workstation' ORDER BY rating DESC LIMIT 3"
    );
    assistantReply = `Here are our highest-rated workstation peripherals: **${prodRes.rows[0].name}** with hot-swap switches and 57° vertical ergonomic mouse.`;
    actions = prodRes.rows.map((p) => ({
      label: `⚡ View ${p.name}`,
      actionType: 'view_product',
      payload: p
    }));
  } else if (text.includes('monitor') || text.includes('display') || text.includes('4k') || text.includes('screen')) {
    const prodRes = await pool.query(
      "SELECT * FROM products WHERE category = 'Displays' ORDER BY rating DESC LIMIT 3"
    );
    assistantReply = `Recommended display: **${prodRes.rows[0].name}** (27" 4K IPS Black with 90W single-cable USB-C power delivery).`;
    actions = prodRes.rows.map((p) => ({
      label: `🖥️ View ${p.name} (₹${p.price})`,
      actionType: 'view_product',
      payload: p
    }));
  } else if (text.includes('bundle') || text.includes('stack') || text.includes('setup')) {
    const bundleRes = await pool.query('SELECT * FROM bundles LIMIT 3');
    assistantReply = `We have curated ${bundleRes.rows.length} AI workstation bundles saving up to 18% with zero configuration friction.`;
    actions = bundleRes.rows.map((b) => ({
      label: `📦 ${b.title} (Save ${b.savings_percentage}%)`,
      actionType: 'view_bundle',
      payload: b
    }));
  } else {
    assistantReply = `Hello! I'm your RazorFlow AI Commerce Assistant. I can recommend developer workstations, compare acoustic hardware specs, check stock, or apply verified promotional discounts within merchant boundaries. What are you looking to build today?`;
    actions = [
      { label: '🎧 Top Studio Audio', actionType: 'search_intent', payload: 'Audio' },
      { label: '⚡ Ergonomic Keyboards', actionType: 'search_intent', payload: 'Workstation' },
      { label: '🖥️ 4K Displays', actionType: 'search_intent', payload: 'Displays' }
    ];
  }

  // 4. Log Assistant Reply to Database
  try {
    const botMsgId = `msg_${Date.now()}_b`;
    await Promise.race([
      pool.query(
        `INSERT INTO ai_messages (id, session_id, role, sender, content, metadata, created_at)
         VALUES ($1, $2, 'assistant', 'assistant', $3, $4, NOW())`,
        [botMsgId, sessionId, assistantReply, JSON.stringify({ actions, policyResult })]
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);
  } catch {}

  return {
    sessionId,
    sender: 'assistant',
    content: assistantReply,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions,
    policyEvaluation: policyResult
  };
}
