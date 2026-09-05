import { ShoppingAgent } from './server/ai/shoppingAgent.js';

const agent = new ShoppingAgent();
const intent = agent.interpretIntent("I need a useful birthday gift for my sister under ₹2,000. Something that isn't cosmetics.");
console.log(JSON.stringify(intent, null, 2));
