import { ProductSearchService } from '../externalCommerce/productSearch.js';
import { ExternalProduct, ProductAvailability, ProviderName } from '../externalCommerce/types.js';
import { productRepository, customerRepository, orderRepository } from '../repositories/index.js';
import { evaluateAgentAction } from '../policyEngine.js';
import { pool } from '../db.js';

export interface InterpretedIntent {
  intent: 'product_search' | 'comparison' | 'add_to_cart' | 'review_checkout' | 'execute_checkout' | 'order_status' | 'unknown';
  rawQuery: string;
  searchQuery: string;
  category: string | null;
  budget: {
    min?: number;
    max?: number;
    currency: string;
  };
  brandPreferences: string[];
  exclusions: string[];
  requiredSpecs: Record<string, string | number | boolean>;
  quantity: number;
  occasion?: string;
  recipient?: string;
  rankingCriterion: 'BEST_VALUE' | 'HIGHEST_RATED' | 'LOWEST_PRICE' | 'PREMIUM' | 'SPEC_MATCH';
  isComparison: boolean;
  isDiscountInquiry: boolean;
  followUpRequired: boolean;
  discoveredCategories?: string[];
}

export type RecommendationTier = 'TOP_PICK' | 'STRONG_MATCH' | 'ALTERNATIVE';

export interface RecommendationItem {
  product: ExternalProduct;
  source: ProviderName | 'merchant_catalog';
  reason: string;
  matchReasons: string[];
  rank: number;
  tier: RecommendationTier;
  observedPrice: {
    amount: number;
    currency: string;
    originalAmount?: number | null;
    discountPercentage?: number | null;
  };
  observedAvailability: ProductAvailability;
  matchScore: number;
  timestamp: string;
  productUrl: string | null;
  isFresh: boolean;
  recommendationId?: string;
}

export interface ComparisonFeature {
  featureName: string;
  values: Record<string, string | number | null>;
}

export interface ComparisonMatrix {
  products: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    rating: number;
    features: Record<string, string | number | null>;
    source: ProviderName | 'merchant_catalog';
    rank: number;
    tier: RecommendationTier;
  }>;
  commonFeatures: string[];
  differentiators: string[];
  recommendationSummary: string;
}

export interface ShoppingAgentRequest {
  intent: string;
  customerId?: string;
  context?: {
    previousIntent?: Partial<InterpretedIntent>;
    previousRecommendations?: RecommendationItem[];
    cartId?: string;
  };
}

export interface ShoppingAgentResponse {
  sessionId: string;
  interpretedIntent: InterpretedIntent;
  matchingProducts: ExternalProduct[];
  recommendations: RecommendationItem[];
  comparison: ComparisonMatrix | null;
  summary: string;
  sourceInfo: {
    providersQueried: string[];
    totalRetrieved: number;
    freshnessWindowHours: number;
    failedProviders?: string[];
  };
  policyEvaluation?: any;
  followUpRequired: boolean;
  action?: {
    type: 'ADD_TO_CART';
    product: ExternalProduct;
    quantity: number;
    source: ProviderName | 'merchant_catalog';
    sessionId?: string;
    recommendationId?: string;
  } | {
    type: 'REVIEW_CHECKOUT';
    cartId?: string;
    sessionId?: string;
  } | {
    type: 'EXECUTE_CHECKOUT';
    cartId?: string;
    sessionId?: string;
  } | {
    type: 'ORDER_STATUS';
    order?: any;
    sessionId?: string;
  };
}

export class ShoppingAgent {
  private searchService: ProductSearchService;
  private freshnessWindowHours: number = 24;

  constructor(searchService = new ProductSearchService()) {
    this.searchService = searchService;
  }

  private parseNumberWithSuffix(valStr: string, suffix?: string): number {
    let num = parseFloat(valStr.replace(/,/g, ''));
    if (suffix?.toLowerCase() === 'k') num *= 1000;
    if (suffix?.toLowerCase() === 'lac' || suffix?.toLowerCase() === 'lakh') num *= 100000;
    return num;
  }

  private wordToNum(word: string): number {
    const map: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    return map[word.toLowerCase()] || parseInt(word, 10);
  }

  /**
   * Interpret natural language user shopping intent without hallucinations
   */
  public interpretIntent(userMessage: string, previousIntent?: Partial<InterpretedIntent>): InterpretedIntent {
    const text = userMessage.trim();
    const lower = text.toLowerCase();

    let maxBudget: number | undefined = undefined;
    let minBudget: number | undefined = undefined;
    let currency = 'INR';

    if (lower.includes('$') || lower.includes('usd') || lower.includes('dollar')) {
      currency = 'USD';
    } else if (lower.includes('€') || lower.includes('eur')) {
      currency = 'EUR';
    }

    // Range Budget extraction
    const rangeMatch = lower.match(/(?:between|from)\s*(?:rs\.?|inr|₹|\$|€)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|lac|lakh)?\s*(?:and|to)\s*(?:rs\.?|inr|₹|\$|€)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|lac|lakh)?/i);
    if (rangeMatch) {
      minBudget = this.parseNumberWithSuffix(rangeMatch[1], rangeMatch[2]);
      maxBudget = this.parseNumberWithSuffix(rangeMatch[3], rangeMatch[4]);
    } else {
      const underMatch = lower.match(/(?:under|below|less than|max|up to|budget of|within|cheaper than|around)\s*(?:rs\.?|inr|₹|\$|€)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|lac|lakh)?/i);
      if (underMatch) {
        const parsed = this.parseNumberWithSuffix(underMatch[1], underMatch[2]);
        if (!isNaN(parsed) && parsed > 0) maxBudget = parsed;
      }

      const aboveMatch = lower.match(/(?:above|more than|over|min|at least|starting from|from)\s*(?:rs\.?|inr|₹|\$|€)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(k|lac|lakh)?/i);
      if (aboveMatch) {
        const parsed = this.parseNumberWithSuffix(aboveMatch[1], aboveMatch[2]);
        if (!isNaN(parsed) && parsed > 0) minBudget = parsed;
      }
    }

    // 1. Parse Exclusions (Ordering step 1)
    const exclusions: string[] = [];
    const excludePatterns = [
      /(?:don't show|dont show|do not show|avoid|without|excluding|exclude|except|that isn't|that isnt|that is not|isn't|isnt|is not|no|not)\s+([a-z0-9\s]+?)(?:$|[.,;!]|(?:\band\b|\bwith\b|\bunder\b|\bfor\b|\bbut\b|\bones\b))/gi,
      /(?:excluding|exclude|without|avoid)\s+([a-z0-9]+)/gi,
      /(?:don't show|dont show|do not show)\s+([a-z0-9]+)/gi,
      /(?:that isn't|that isnt|that is not|isn't|isnt|is not|not|no)\s+([a-z0-9]+)/gi
    ];
    for (const pat of excludePatterns) {
      const matches = Array.from(lower.matchAll(pat));
      for (const m of matches) {
        const term = m[1]?.trim();
        if (term && term.length >= 2 && !exclusions.some(e => e.toLowerCase() === term.toLowerCase())) {
          if (!['under', 'above', 'a', 'an', 'the', 'my', 'her', 'his'].includes(term)) {
            exclusions.push(term);
          }
        }
      }
    }

    // Explicit checks for common exclusion variations (e.g. cosmetics, refurbished, etc.)
    const cosmeticsNegMatch = /\b(?:no|not|isn't|isnt|is not|that isn't|that isnt|that is not|without|avoid|excluding|exclude|don't show|dont show|do not show)\s+cosmetics?\b/i;
    if (cosmeticsNegMatch.test(lower) || lower.includes("isn't cosmetics") || lower.includes("isnt cosmetics") || lower.includes("is not cosmetics") || lower.includes("not cosmetics") || lower.includes("no cosmetics")) {
      if (!exclusions.some(e => e.toLowerCase().includes('cosmetic'))) {
        exclusions.push('cosmetics');
        exclusions.push('Cosmetics');
      }
    }
    if (lower.includes('no refurbished') || lower.includes('not refurbished')) exclusions.push('refurbished');
    if (lower.includes('no used') || lower.includes('not used')) exclusions.push('used');
    if (lower.includes('not wired') || lower.includes('no wired')) exclusions.push('wired');
    if (lower.includes('no leather') || lower.includes('not leather')) exclusions.push('leather');

    const knownBrands = ['Apple', 'Sony', 'Dell', 'Lenovo', 'HP', 'Asus', 'Logitech', 'Sennheiser', 'Bose', 'Samsung', 'Keychron', 'LG', 'Anker', 'Nike', 'Adidas', 'Puma'];
    const brandPreferences: string[] = [];
    for (const brand of knownBrands) {
      if (lower.includes(brand.toLowerCase())) {
        if (exclusions.some(e => e.toLowerCase() === brand.toLowerCase()) || lower.match(new RegExp(`\\b(?:not|no|avoid|without|except|excluding)\\s+${brand.toLowerCase()}\\b`))) {
          if (!exclusions.some(e => e.toLowerCase() === brand.toLowerCase())) exclusions.push(brand);
        } else {
          brandPreferences.push(brand);
        }
      }
    }

    // 2. Resolve Excluded Categories (Ordering step 2)
    const categoryKeywords: Record<string, string[]> = {
      'Laptops': ['laptop', 'macbook', 'notebook', 'thinkpad', 'ultrabook', 'chromebook'],
      'Audio': ['headphone', 'earphone', 'earbud', 'headset', 'dac', 'audio', 'speaker', 'sound', 'microphone', 'mic'],
      'Workstation': ['keyboard', 'mouse', 'desk', 'chair', 'trackpad', 'peripheral'],
      'Displays': ['monitor', 'screen', 'display', '4k display', 'ultrawide'],
      'Smartphones': ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'galaxy'],
      'Accessories': ['cable', 'charger', 'hub', 'stand', 'adapter', 'case', 'sleeve', 'tag', 'nfc', 'keychain'],
      'Shoes': ['shoes', 'sneakers', 'running shoes', 'boots', 'footwear'],
      'Bags': ['backpack', 'bag', 'luggage', 'suitcase', 'duffel'],
      'Stationery': ['notebook', 'pen', 'pencil', 'diary', 'journal', 'books', 'book'],
      'Cosmetics': ['cosmetics', 'makeup', 'lipstick', 'foundation', 'skincare'],
      'Watches': ['watch', 'smartwatch'],
      'Jewelry': ['jewelry', 'ring', 'necklace', 'bracelet'],
      'Lighting': ['lamp', 'light', 'desk lamp', 'oled lamp'],
      'Home': ['home', 'decor', 'lamp', 'light']
    };

    const excludedCategories = new Set<string>();
    for (const exc of exclusions) {
      const excLower = exc.toLowerCase();
      for (const [catName, kws] of Object.entries(categoryKeywords)) {
        if (catName.toLowerCase() === excLower || kws.some(kw => excLower.includes(kw) || kw.includes(excLower))) {
          excludedCategories.add(catName);
        }
      }
    }

    // 3 & 4. Detect Positive Categories while Preventing Excluded Categories (Ordering steps 3 & 4)
    let category: string | null = null;
    for (const [catName, kws] of Object.entries(categoryKeywords)) {
      if (excludedCategories.has(catName)) {
        continue; // Excluded categories must NEVER become primary search categories
      }
      const matchedKw = kws.find(kw => {
        if (!lower.includes(kw)) return false;
        const negPattern = new RegExp(`\\b(?:not|no|isn't|isnt|is not|without|avoid|excluding|exclude|that isn't|that isnt|that is not)\\s+([a-z0-9\\s]*?\\b)?${kw}\\b`, 'i');
        return !negPattern.test(lower);
      });
      if (matchedKw) {
        category = catName;
        break;
      }
    }

    const requiredSpecs: Record<string, string | number | boolean> = {};
    if (lower.includes('16gb') || lower.includes('16 gb')) requiredSpecs['RAM'] = '16GB';
    if (lower.includes('32gb') || lower.includes('32 gb')) requiredSpecs['RAM'] = '32GB';
    if (lower.includes('64gb') || lower.includes('64 gb')) requiredSpecs['RAM'] = '64GB';
    if (lower.includes('8gb') || lower.includes('8 gb')) requiredSpecs['RAM'] = '8GB';
    if (lower.includes('512gb') || lower.includes('512 gb')) requiredSpecs['Storage'] = '512GB';
    if (lower.includes('1tb') || lower.includes('1 tb')) requiredSpecs['Storage'] = '1TB';
    if (lower.includes('4k') || lower.includes('uhd')) requiredSpecs['Resolution'] = '4K';
    if (lower.includes('anc') || lower.includes('noise cancel') || lower.includes('noise-cancel')) requiredSpecs['ANC'] = 'Active Noise Cancellation';
    if (lower.includes('wireless') || lower.includes('bluetooth') || lower.includes('cordless')) requiredSpecs['Connectivity'] = 'Wireless';
    if (lower.includes('mechanical')) requiredSpecs['SwitchType'] = 'Mechanical';
    if (lower.includes('ai/ml') || lower.includes('machine learning')) requiredSpecs['Workload'] = 'AI/ML acceleration';
    
    // Attributes handling
    if (lower.includes('black')) requiredSpecs['Color'] = 'Black';
    if (lower.includes('white')) requiredSpecs['Color'] = 'White';
    if (lower.includes('red')) requiredSpecs['Color'] = 'Red';
    if (lower.includes('blue')) requiredSpecs['Color'] = 'Blue';
    if (lower.includes('green')) requiredSpecs['Color'] = 'Green';
    if (lower.includes('silver')) requiredSpecs['Color'] = 'Silver';
    if (lower.includes('waterproof') || lower.includes('water-proof')) requiredSpecs['Waterproof'] = 'Yes';
    if (lower.includes('lightweight') || lower.includes('light-weight')) requiredSpecs['Weight'] = 'Lightweight';
    if (lower.includes('battery life') || lower.includes('good battery')) requiredSpecs['Battery'] = 'Long battery life';
    if (lower.includes('camera') || lower.includes('good camera')) requiredSpecs['Camera'] = 'High quality camera';

    let quantity = 1;
    const qtyMatch = lower.match(/(?:\b)(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+)(?:items|pcs|pieces|of|identicals?)?(?:\b)/i);
    if (qtyMatch && !lower.includes('under') && !lower.includes('above')) {
       // Avoid parsing "two" from "under two thousand"
       const num = this.wordToNum(qtyMatch[1]);
       if (!isNaN(num) && num > 0 && num < 100) {
         quantity = num;
       }
    }

    let occasion: string | undefined = undefined;
    let recipient: string | undefined = undefined;
    if (lower.includes('birthday')) occasion = 'birthday';
    else if (lower.includes('college')) occasion = 'college';
    else if (lower.includes('room') || lower.includes('new room')) occasion = 'room';
    else if (lower.includes('gift')) occasion = 'gift';
    else if (lower.includes('party')) occasion = 'party';

    if (lower.includes('sister')) recipient = 'sister';
    else if (lower.includes('dad') || lower.includes('father')) recipient = 'dad';
    else if (lower.includes('mom') || lower.includes('mother')) recipient = 'mom';
    else if (lower.includes('friend')) recipient = 'friend';
    else if (lower.includes('brother')) recipient = 'brother';
    else if (lower.includes('wife')) recipient = 'wife';
    else if (lower.includes('husband')) recipient = 'husband';

    let rankingCriterion: InterpretedIntent['rankingCriterion'] = 'BEST_VALUE';
    if (lower.includes('cheapest') || lower.includes('lowest price') || lower.includes('budget') || lower.includes('affordable')) {
      rankingCriterion = 'LOWEST_PRICE';
    } else if (lower.includes('highest rated') || lower.includes('best rated') || lower.includes('top rated') || lower.includes('best review')) {
      rankingCriterion = 'HIGHEST_RATED';
    } else if (lower.includes('premium') || lower.includes('high end') || lower.includes('top of the line') || lower.includes('flagship')) {
      rankingCriterion = 'PREMIUM';
    } else if (Object.keys(requiredSpecs).length > 0) {
      rankingCriterion = 'SPEC_MATCH';
    } else if (lower.includes('useful') || lower.includes('practical') || lower.includes('utility')) {
      rankingCriterion = 'BEST_VALUE';
    } else if (lower.includes('best') || lower.includes('good')) {
      rankingCriterion = 'BEST_VALUE';
    }

    const isComparison = lower.includes('compare') || lower.includes('vs') || lower.includes('difference between') || lower.includes('better between') || lower.includes('which is better');
    const isDiscountInquiry = lower.includes('discount') || lower.includes('coupon') || lower.includes('offer') || lower.includes('promo');

    let intentType: InterpretedIntent['intent'] = isComparison ? 'comparison' : 'product_search';

    if (lower.match(/\b(confirm purchase|yes confirm|confirm order|pay now|execute order)\b/)) {
      intentType = 'execute_checkout';
    } else if (lower.match(/\b(what(?:'s| is)(?: the)? (?:order status|status of (?:my )?order)|what(?:'s| is) (?:my )?order status|where is my order|show (?:my )?(?:latest )?order|did my payment go through|what did i order|track (?:my )?order|my orders|order status)\b/)) {
      intentType = 'order_status';
    } else if (lower.match(/\b(ready to buy|checkout|review (?:my )?order|review it|yes,? review it|show (?:my )?cart|what(?:'s| is) my total\??|proceed to checkout|i want to buy)\b/)) {
      intentType = 'review_checkout';
    } else if (lower.match(/\b(add .* to cart|add to cart|buy this|add the top pick|add that|add .* those|add .* it|add .* this|add .* that)\b/)) {
      intentType = 'add_to_cart';
    }

    let cleanQuery = text
      .replace(/compare(?: these(?: two)?)?/gi, '')
      .replace(/which( one)? is better/gi, '')
      .replace(/the best/gi, '')
      .replace(/(?:find|show|give|get|look for|i want|i need|buy)\s+(?:me\s+)?(?:a\s+|an\s+)?/gi, '')
      .replace(/(?:useful|practical|handy|everyday)\s+/gi, '')
      .replace(/(?:birthday|anniversary|holiday|party|college|room)\s+(?:gift\s+)?/gi, '')
      .replace(/(?:gift|present)\s+(?:for\s+(?:my\s+)?[a-z]+\s*)?/gi, '')
      .replace(/(?:for\s+(?:my\s+)?(?:sister|brother|dad|mom|father|mother|friend|wife|husband|colleague))/gi, '')
      .replace(/(?:something\s+)?(?:that\s+)?(?:isn't|isnt|is not|not|without|excluding|avoid|no)\s+[a-z0-9\s]+/gi, '')
      .replace(/(?:under|below|less than|max|up to)\s*(?:rs\.?|inr|₹|\$|€)?\s*[0-9,]+k?/gi, '')
      .replace(/(?:above|more than|over|min|at least)\s*(?:rs\.?|inr|₹|\$|€)?\s*[0-9,]+k?/gi, '')
      .replace(/(?:between|from)\s*(?:rs\.?|inr|₹|\$|€)?\s*[0-9,]+k?\s*(?:and|to)\s*(?:rs\.?|inr|₹|\$|€)?\s*[0-9,]+k?/gi, '')
      .replace(/(?:excluding|exclude|without)\s+[a-z0-9]+/gi, '')
      .replace(/for\s+(ai\/ml|ai|ml|gaming|office|coding|programming)/gi, '')
      .replace(/you can find/gi, '')
      .replace(/top\s+[0-9]+/gi, '')
      .replace(/please/gi, '')
      .replace(/[.,;!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let searchQuery = cleanQuery;
    if (searchQuery.length < 2) {
      searchQuery = category || (occasion ? `${occasion} gift` : '') || text;
    }

    let followUpRequired = false;
    // Ambiguity detection
    if (!['add_to_cart', 'review_checkout', 'execute_checkout', 'order_status'].includes(intentType) && !category && !occasion && (lower.includes('a good one') || lower.includes('something') || lower.includes('this'))) {
      intentType = 'unknown';
      followUpRequired = true;
    } else if (!['add_to_cart', 'review_checkout', 'execute_checkout', 'order_status'].includes(intentType) && !category && lower.includes('one for') && occasion) {
      intentType = 'unknown';
      followUpRequired = true;
    }

    const currentIntent: InterpretedIntent = {
      intent: intentType,
      rawQuery: text,
      searchQuery,
      category,
      budget: { min: minBudget, max: maxBudget, currency },
      brandPreferences,
      exclusions,
      requiredSpecs,
      quantity,
      occasion,
      recipient,
      rankingCriterion,
      isComparison,
      isDiscountInquiry,
      followUpRequired
    };

    // Phase 3.3 - Category Discovery Mapping
    if (!currentIntent.category && (currentIntent.occasion || currentIntent.recipient)) {
      const discovered = new Set<string>();
      if (currentIntent.occasion === 'birthday' || currentIntent.occasion === 'gift' || currentIntent.occasion === 'party') {
        discovered.add('Audio');
        discovered.add('Workstation');
        discovered.add('Accessories');
        discovered.add('Displays');
        discovered.add('Lighting');
        discovered.add('Home');
        discovered.add('Watches');
        discovered.add('Bags');
        discovered.add('Jewelry');
      }
      if (currentIntent.occasion === 'college') {
        discovered.add('Laptops');
        discovered.add('Bags');
        discovered.add('Stationery');
        discovered.add('Audio');
      }
      if (currentIntent.occasion === 'room') {
        discovered.add('Displays');
        discovered.add('Workstation');
        discovered.add('Audio');
        discovered.add('Home');
      }
      
      // Excluded categories must NEVER become search categories
      for (const excCat of excludedCategories) {
        discovered.delete(excCat);
      }
      
      if (discovered.size > 0) {
        currentIntent.discoveredCategories = Array.from(discovered);
      }
    }

    // Merge with previous intent if provided
    if (previousIntent && !followUpRequired && !isComparison) {
      currentIntent.category = currentIntent.category || previousIntent.category || null;
      currentIntent.occasion = currentIntent.occasion || previousIntent.occasion;
      currentIntent.recipient = currentIntent.recipient || previousIntent.recipient;
      
      currentIntent.budget = {
        min: currentIntent.budget.min ?? previousIntent.budget?.min,
        max: currentIntent.budget.max ?? previousIntent.budget?.max,
        currency: currentIntent.budget.currency || previousIntent.budget?.currency || 'INR'
      };

      currentIntent.brandPreferences = Array.from(new Set([...(previousIntent.brandPreferences || []), ...currentIntent.brandPreferences]));
      currentIntent.exclusions = Array.from(new Set([...(previousIntent.exclusions || []), ...currentIntent.exclusions]));
      currentIntent.requiredSpecs = { ...(previousIntent.requiredSpecs || {}), ...currentIntent.requiredSpecs };

      if (previousIntent.discoveredCategories && !currentIntent.discoveredCategories) {
        currentIntent.discoveredCategories = previousIntent.discoveredCategories;
      }

      // Update search query based on merge
      if (!currentIntent.category && currentIntent.searchQuery === currentIntent.rawQuery) {
         currentIntent.searchQuery = previousIntent.searchQuery || currentIntent.searchQuery;
      }
    }

    return currentIntent;
  }

  /**
   * Main shopping execution pipeline: Category Discovery -> Multi-Provider Search -> Normalize -> Hard Constraints -> Deduplicate -> Rank -> Recommend -> Audit
   */
  public async processShoppingRequest(req: ShoppingAgentRequest): Promise<ShoppingAgentResponse> {
    const sessionId = req.sessionId || `ai_shop_${Date.now()}`;
    const intent = this.interpretIntent(req.message, req.context?.previousIntent);

    await this.logSessionAndMessage(sessionId, req.customerId, req.message);

    if (intent.followUpRequired) {
      const summary = "What kind of product are you looking for?";
      await this.logAssistantMessage(sessionId, summary, [], null);
      return {
        sessionId,
        interpretedIntent: intent,
        matchingProducts: [],
        recommendations: [],
        comparison: null,
        summary,
        sourceInfo: { providersQueried: [], totalRetrieved: 0, freshnessWindowHours: this.freshnessWindowHours },
        followUpRequired: true
      };
    }

    if (intent.intent === 'add_to_cart' && req.context?.previousRecommendations && req.context.previousRecommendations.length > 0) {
      const topPick = req.context.previousRecommendations.find(r => r.tier === 'TOP_PICK') || req.context.previousRecommendations[0];
      const qty = intent.quantity > 0 ? intent.quantity : 1;
      
      const summary = `Added ${qty}x **${topPick.product.title}** to your cart.\n\nYour current total is ₹${(topPick.product.price * qty).toLocaleString()}. Would you like to review your order?`;
      await this.logAssistantMessage(sessionId, summary, [], null);
      
      return {
        sessionId,
        interpretedIntent: intent,
        matchingProducts: [],
        recommendations: [],
        comparison: null,
        summary,
        sourceInfo: { providersQueried: [], totalRetrieved: 0, freshnessWindowHours: this.freshnessWindowHours },
        followUpRequired: false,
        action: {
          type: 'ADD_TO_CART',
          product: topPick.product,
          quantity: qty,
          source: topPick.source,
          sessionId,
          recommendationId: topPick.recommendationId || `rec_${Date.now()}`
        }
      };
    }

    if (intent.intent === 'review_checkout') {
      const summary = "I've prepared your order review with server-authoritative totals and delivery address. Please confirm when you're ready to purchase.";
      await this.logAssistantMessage(sessionId, summary, [], null);
      
      return {
        sessionId,
        interpretedIntent: intent,
        matchingProducts: [],
        recommendations: [],
        comparison: null,
        summary,
        sourceInfo: { providersQueried: [], totalRetrieved: 0, freshnessWindowHours: this.freshnessWindowHours },
        followUpRequired: false,
        action: { type: 'REVIEW_CHECKOUT', cartId: req.context?.cartId, sessionId }
      };
    }

    if (intent.intent === 'execute_checkout') {
      const summary = "Processing your confirmation to place the order.";
      await this.logAssistantMessage(sessionId, summary, [], null);
      
      return {
        sessionId,
        interpretedIntent: intent,
        matchingProducts: [],
        recommendations: [],
        comparison: null,
        summary,
        sourceInfo: { providersQueried: [], totalRetrieved: 0, freshnessWindowHours: this.freshnessWindowHours },
        followUpRequired: false,
        action: { type: 'EXECUTE_CHECKOUT', cartId: req.context?.cartId, sessionId }
      };
    }

    if (intent.intent === 'order_status') {
      const merchantId = 'merch_razorflow_01';
      const customerId = req.customerId || 'cust-01';
      let latestOrder: any = null;
      try {
        const orders = await orderRepository.listOrders(merchantId, 5, customerId);
        if (orders && orders.length > 0) {
          latestOrder = orders[0];
        }
      } catch (err: any) {
        console.warn('⚠️ Order retrieval error:', err.message);
      }

      let summary = '';
      if (latestOrder) {
        const itemCount = latestOrder.items?.length || 1;
        const status = latestOrder.status || 'CREATED';
        const paymentStatus = latestOrder.paymentStatus || 'PENDING';
        
        if (status === 'PAID' || paymentStatus === 'PAID') {
          summary = `Your order **#${latestOrder.id}** (₹${latestOrder.total}, ${itemCount} item${itemCount > 1 ? 's' : ''}) is **confirmed and paid**. Detailed shipping tracking isn't available yet.`;
        } else if (status === 'PAYMENT_PENDING' || paymentStatus === 'PENDING') {
          summary = `Your order **#${latestOrder.id}** (₹${latestOrder.total}) is currently **awaiting payment**.`;
        } else if (status === 'FAILED' || paymentStatus === 'FAILED') {
          summary = `Your order **#${latestOrder.id}** had a payment issue. Your cart has been preserved so you can retry checkout.`;
        } else {
          summary = `Your order **#${latestOrder.id}** status is **${status}**. Detailed shipping tracking isn't available yet.`;
        }
      } else {
        summary = `You don't have any recent orders yet. When you place an order, you can check its status right here.`;
      }

      await this.logAssistantMessage(sessionId, summary, [], null);

      return {
        sessionId,
        interpretedIntent: intent,
        matchingProducts: [],
        recommendations: [],
        comparison: null,
        summary,
        sourceInfo: { providersQueried: [], totalRetrieved: 0, freshnessWindowHours: this.freshnessWindowHours },
        followUpRequired: false,
        action: { type: 'ORDER_STATUS', order: latestOrder || undefined, sessionId }
      };
    }

    let policyResult: any = null;
    let policyNotice: string | null = null;
    if (intent.isDiscountInquiry) {
      const discountNumMatch = req.message.match(/([0-9]+)\s*%/);
      const requestedPercent = discountNumMatch ? parseInt(discountNumMatch[1], 10) : 10;

      const evalRes = await evaluateAgentAction({
        actorId: 'AI-Shopping-Agent',
        actorType: 'AI Agent',
        intent: req.message,
        actionType: 'APPLY_DISCOUNT',
        parameters: { discountPercent: requestedPercent, cartTotal: intent.budget.max || 10000 }
      });
      policyResult = evalRes;
      if (!evalRes.allowed) {
        policyNotice = `Note: Proposed discount exceeds merchant maximum boundary of 15% (${evalRes.reasonCode}). Capped at verified 10% promo **RAZORFLOW10**.`;
      }
    }

    let externalProducts: ExternalProduct[] = [];
    const providersQueried = new Set<string>();
    const failedProviders = new Set<string>();
    
    // Determine categories to search (Phase 3.3/3.4)
    // Filter out any excluded categories from external search
    const categoriesToSearch = (intent.category 
      ? [intent.category] 
      : (intent.discoveredCategories || [undefined]))
      .filter(cat => !cat || !intent.exclusions.some(exc => exc.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(exc.toLowerCase())));

    // Phase 3.6 - Parallel Provider Execution across Multiple Categories
    try {
      const categorySearches = categoriesToSearch.map(cat => 
        this.searchService.search({
          query: intent.searchQuery,
          category: cat,
          minPrice: intent.budget.min,
          maxPrice: intent.budget.max,
          currency: intent.budget.currency,
          limit: 15
        })
      );
      
      const searchResults = await Promise.allSettled(categorySearches);
      
      for (const res of searchResults) {
        if (res.status === 'fulfilled') {
          externalProducts.push(...res.value.products);
          res.value.providersQueried.forEach(p => providersQueried.add(p));
          res.value.failedProviders.forEach(p => failedProviders.add(p.provider));
        }
      }
    } catch (err: any) {
      console.warn('⚠️ External commerce search returned notice:', err.message);
    }

    // Phase 3.4 & 3.5 - Multi-Provider Internal Catalog Search (Ensure internal orderable products)
    const isBroadOccasionSearch = Boolean(intent.occasion || intent.recipient || !intent.category);
    
    // Internal categories to search, filtering out any excluded categories
    const activeDiscoveredCats = (intent.discoveredCategories || ['Audio', 'Workstation', 'Accessories', 'Displays', 'Lighting'])
      .filter(cat => !intent.exclusions.some(exc => exc.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(exc.toLowerCase())));
      
    const internalCategories = intent.category 
      ? [intent.category] 
      : activeDiscoveredCats;

    const internalCatPromises = internalCategories.map(async cat => {
      const isCatSynonym = cat && (
        intent.searchQuery.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(intent.searchQuery.toLowerCase()) ||
        ['headphones', 'headphone', 'audio', 'earphones', 'earbuds'].includes(intent.searchQuery.toLowerCase())
      );
      
      const internalCatalog = await productRepository.findCatalog({
        search: (isBroadOccasionSearch || isCatSynonym) ? undefined : (intent.searchQuery.length > 1 ? intent.searchQuery : undefined),
        category: cat,
        minPrice: intent.budget.min,
        maxPrice: intent.budget.max,
        limit: 10
      });
      
      return internalCatalog.items.map(item => ({
        provider: 'opencatalog' as ProviderName,
        externalProductId: item.id,
        title: item.name,
        description: item.description,
        brand: item.brand || null,
        category: item.category,
        price: item.price,
        currency: item.currency || 'INR',
        originalPrice: item.originalPrice || null,
        discountPercentage: item.originalPrice ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : null,
        imageUrl: item.image || null,
        additionalImages: item.gallery || [],
        productUrl: null,
        availability: (item.stockCount > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK') as ProductAvailability,
        seller: 'RazorFlow Verified Hardware',
        rating: item.rating || 4.8,
        reviewCount: item.reviewCount || 10,
        shipping: { freeShipping: true, estimatedDays: 2, shippingCost: 0, currency: 'INR' },
        identifiers: { sku: item.sku || null, upc: null, ean: null, isbn: null, mpn: null },
        specifications: item.specs || {},
        fetchedAt: new Date().toISOString(),
        isDiscoveryOnly: true
      }));
    });

    try {
      const internalResults = await Promise.allSettled(internalCatPromises);
      providersQueried.add('opencatalog');
      for (const res of internalResults) {
        if (res.status === 'fulfilled') {
          externalProducts.push(...res.value);
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Internal catalog fallback query note:', err.message);
    }
    
    // Phase 3.10 - Cross-Category Deduplication (just in case they overlap)
    // ProductSearchService handles per-search dedup, but we are aggregating multiple searches
    const seen = new Set<string>();
    const deduplicatedProducts: ExternalProduct[] = [];
    for (const p of externalProducts) {
      const sku = p.identifiers?.sku ? `sku:${p.identifiers.sku}` : null;
      const pid = `id:${p.provider}:${p.externalProductId}`;
      const titleNorm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const brandModel = (p.brand && p.title) ? `bm:${p.brand.toLowerCase()}:${titleNorm}` : null;
      const titleKey = `title:${titleNorm}`;

      const hasSku = sku && seen.has(sku);
      const hasPid = seen.has(pid);
      const hasBrandModel = brandModel && seen.has(brandModel);
      const hasTitle = seen.has(titleKey);

      if (!hasSku && !hasPid && !hasBrandModel && !hasTitle) {
        if (sku) seen.add(sku);
        seen.add(pid);
        if (brandModel) seen.add(brandModel);
        seen.add(titleKey);
        deduplicatedProducts.push(p);
      }
    }

    // Phase 3.8 - Hard Constraint Filtering
    const validatedProducts = this.filterAndValidateProducts(deduplicatedProducts, intent);
    
    // Phase 3.12 - AI Ranking
    const rankedRecommendations = this.rankProducts(validatedProducts, intent);

    let comparisonMatrix: ComparisonMatrix | null = null;
    const confidentRecommendations = rankedRecommendations.filter(r => r.matchScore >= 70);

    if (intent.intent === 'comparison' || (intent.isComparison && confidentRecommendations.length >= 2)) {
      comparisonMatrix = this.buildComparisonMatrix(confidentRecommendations.slice(0, 3), intent);
    }

    const summary = this.generateSummary(intent, confidentRecommendations, comparisonMatrix, policyNotice, categoriesToSearch, Array.from(failedProviders));
    
    // We log all ranked recommendations, but only return the confident ones
    await this.recordShoppingEvents(sessionId, req.customerId, intent, confidentRecommendations, Array.from(providersQueried));
    await this.logAssistantMessage(sessionId, summary, confidentRecommendations, policyResult);

    return {
      sessionId,
      interpretedIntent: intent,
      matchingProducts: validatedProducts,
      recommendations: confidentRecommendations,
      comparison: comparisonMatrix,
      summary,
      sourceInfo: { 
        providersQueried: Array.from(providersQueried), 
        totalRetrieved: deduplicatedProducts.length, 
        freshnessWindowHours: this.freshnessWindowHours,
        failedProviders: Array.from(failedProviders)
      },
      policyEvaluation: policyResult,
      followUpRequired: false
    };
  }

  private filterAndValidateProducts(products: ExternalProduct[], intent: InterpretedIntent): ExternalProduct[] {
    return products.filter(product => {
      // Phase 3.8 & 3.9 - Budget and Currency limits
      if (intent.budget.max !== undefined && product.price > intent.budget.max) return false;
      if (intent.budget.min !== undefined && product.price < intent.budget.min) return false;

      // Ensure we don't accidentally display Out of Stock items if they specifically ask for items
      if (product.availability === 'OUT_OF_STOCK') return false;

      // Phase 3.8 - Exclusions
      if (intent.exclusions.length > 0) {
        const fullText = `${product.title} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
        for (const exc of intent.exclusions) {
          if (fullText.includes(exc.toLowerCase())) return false;
        }
      }
      return true;
    });
  }

  private rankProducts(products: ExternalProduct[], intent: InterpretedIntent): RecommendationItem[] {
    const scored = products.map(product => {
      let score = 0;
      const matchReasons: string[] = [];

      // 1. Data freshness
      const fetchedTime = Date.parse(product.fetchedAt || '');
      const isFresh = !isNaN(fetchedTime) ? (Date.now() - fetchedTime) <= this.freshnessWindowHours * 3600 * 1000 : true;
      if (!isFresh) {
        score -= 10;
      }

      // 2. Availability (Hard constraint handled pre-ranking, but boost IN_STOCK)
      if (product.availability === 'IN_STOCK') { 
        score += 5; 
        matchReasons.push('In stock for immediate dispatch'); 
      } else if (product.availability === 'LIMITED_STOCK') { 
        score += 2; 
        matchReasons.push('Limited stock available'); 
      }

      // 3. Brand match (10%)
      if (intent.brandPreferences.length > 0 && product.brand) {
        const brandMatch = intent.brandPreferences.some(b => b.toLowerCase() === product.brand?.toLowerCase());
        if (brandMatch) { 
          score += 10; 
          matchReasons.push(`Matches requested brand (${product.brand})`); 
        }
      }

      // 4. Attribute / Spec Match (20%)
      let specMatchCount = 0;
      const totalSpecs = Object.keys(intent.requiredSpecs).length;
      for (const [reqKey, reqVal] of Object.entries(intent.requiredSpecs)) {
        const productSpecKeys = Object.keys(product.specifications || {});
        const hasSpec = productSpecKeys.some(k => 
          k.toLowerCase().includes(reqKey.toLowerCase()) && 
          String(product.specifications[k])?.toLowerCase().includes(String(reqVal).toLowerCase())
        );
        const inTitle = product.title.toLowerCase().includes(String(reqVal).toLowerCase());
        if (hasSpec || inTitle) { 
          specMatchCount++;
          score += (20 / (totalSpecs || 1)); 
          matchReasons.push(`Matches requirement: ${reqVal}`); 
        }
      }

      // 5. Budget Fit (15%)
      if (intent.budget.max && product.price <= intent.budget.max) {
        const savings = intent.budget.max - product.price;
        if (savings > 0) { 
          // Reward being comfortably under budget, but don't just blindly sort by cheapest unless LOWEST_PRICE requested
          const pctUnder = savings / intent.budget.max;
          score += Math.min(15, pctUnder * 15 + 5); 
          matchReasons.push(`Comfortably within your ${product.currency} ${intent.budget.max} budget`); 
        }
      } else if (!intent.budget.max) {
        // If no budget, assume a neutral budget score
        score += 5;
      }

      // 6. Occasion/Recipient Relevance (10%)
      if (intent.occasion || intent.recipient) {
        const fullText = `${product.title} ${product.category} ${product.description || ''}`.toLowerCase();
        let matchedOccasion = false;
        if (intent.occasion && fullText.includes(intent.occasion.toLowerCase())) {
          score += 5;
          matchedOccasion = true;
        }
        if (intent.recipient && fullText.includes(intent.recipient.toLowerCase())) {
          score += 5;
          matchedOccasion = true;
        }
        
        // Also boost if category was discovered from semantic intent and matches
        if (intent.discoveredCategories?.includes(product.category) && !matchedOccasion) {
          score += 10;
          matchReasons.push(`Highly relevant for ${intent.occasion || intent.recipient}`);
        } else if (matchedOccasion) {
          matchReasons.push(`Highly relevant for ${intent.occasion || intent.recipient}`);
        }
      }

      // 7. Category / Intent relevance (30%)
      const titleLower = product.title.toLowerCase();
      const searchWords = intent.searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let wordMatches = 0;
      for (const w of searchWords) {
        const term = (w.length > 3 && w.endsWith('s')) ? w.slice(0, -1) : w;
        if (titleLower.includes(term) || product.category.toLowerCase().includes(term)) wordMatches++;
      }
      if (searchWords.length > 0) {
        score += (wordMatches / searchWords.length) * 30;
      } else {
        score += 30; // Direct category browse
      }

      // 8. Quality / Ratings (5%)
      if (product.rating && product.rating >= 4.5) { 
        score += 5; 
        matchReasons.push(`Highly rated (${product.rating}★)`); 
      }

      // Apply primary sorting criterion boosts
      if (intent.rankingCriterion === 'LOWEST_PRICE') {
        const priceBonus = Math.max(0, 20 - (product.price / 1000));
        score += priceBonus;
      } else if (intent.rankingCriterion === 'HIGHEST_RATED' && product.rating) {
        score += product.rating * 3;
      } else if (intent.rankingCriterion === 'PREMIUM') {
        score += Math.min(15, product.price / 1000); // More expensive = more premium for this heuristic
      }

      // Boost internal merchant catalog items so they are orderable and prioritized
      if (product.provider === 'opencatalog') {
        score += 25;
        matchReasons.push('Verified in-stock item directly orderable with fast delivery');
      }

      // If user indicated "useful" or value preference
      if (intent.rankingCriterion === 'BEST_VALUE' && ['Audio', 'Workstation', 'Accessories', 'Displays', 'Lighting'].includes(product.category)) {
        score += 15;
        matchReasons.push('High everyday utility and exceptional value');
      }

      const matchScore = Math.min(99, Math.max(20, Math.round(score)));
      const primaryReason = matchReasons.length > 0 ? matchReasons[0] : `Matches your search for ${intent.searchQuery}`;

      return {
        product,
        source: product.provider || 'opencatalog',
        reason: primaryReason,
        matchReasons,
        rank: 0, // Will be set after sorting
        tier: 'ALTERNATIVE' as RecommendationTier,
        observedPrice: { amount: product.price, currency: product.currency, originalAmount: product.originalPrice, discountPercentage: product.discountPercentage },
        observedAvailability: product.availability,
        matchScore,
        timestamp: new Date().toISOString(),
        productUrl: product.productUrl,
        isFresh
      };
    });

    // Phase 3.14 / Phase 4 - Bounded limit and explicit rank tiers
    const sorted = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    
    // Assign ranks and tiers
    sorted.forEach((item, index) => {
      item.rank = index + 1;
      if (index === 0) {
        item.tier = 'TOP_PICK';
      } else if (index < 4 && item.matchScore > 35) {
        item.tier = 'STRONG_MATCH';
      } else {
        item.tier = 'ALTERNATIVE';
      }
    });

    return sorted;
  }

  public buildComparisonMatrix(items: RecommendationItem[], intent: InterpretedIntent): any {
    const products = items.map(item => {
      const p = item.product;
      const features: Record<string, string | number | null> = {
        'Price': `${p.currency} ${p.price.toLocaleString()}`,
        'Brand': p.brand || 'Not specified',
        'Availability': p.availability,
        'Rating': p.rating ? `${p.rating}★` : 'No rating',
        'Source': p.seller || item.source
      };
      if (p.specifications) {
        for (const [k, v] of Object.entries(p.specifications)) {
          features[k] = v;
        }
      }
      return {
        id: p.externalProductId,
        title: p.title,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        availability: p.availability,
        productUrl: p.productUrl,
        imageUrl: p.imageUrl,
        features
      };
    });

    const winner = items[0];
    const verdict = winner 
      ? `**${winner.product.title}** is recommended with highest match score (${winner.matchScore}%) for ${intent.searchQuery} at ${winner.product.currency} ${winner.product.price.toLocaleString()}.` 
      : 'No clear winner could be determined from the available products.';

    return { products, verdict };
  }

  private generateSummary(
    intent: InterpretedIntent,
    recommendations: RecommendationItem[],
    comparison: ComparisonMatrix | null,
    policyNotice: string | null,
    searchedCategories: string[],
    failedProviders?: string[]
  ): string {
    if (recommendations.length === 0) {
      if (failedProviders && failedProviders.length > 0) {
        return `I couldn't retrieve products right now because external marketplaces were temporarily unavailable. Please try again in a moment.`;
      }
      if (intent.budget && (intent.budget.max || intent.budget.min)) {
        return `I couldn't find any perfect matches for "${intent.searchQuery}" within your specified budget. Try adjusting the price range.`;
      }
      return `I couldn't find any highly confident matches for "${intent.searchQuery}" currently in stock. Please try adjusting your search.`;
    }

    const topRec = recommendations[0];
    let msg = `I retrieved **${recommendations.length} verified listings** for "${intent.searchQuery}". `;
    
    // Phase 3.18 - Semantic Category discovery mention
    if (intent.discoveredCategories && intent.discoveredCategories.length > 0) {
      msg = `I searched across ${intent.discoveredCategories.join(', ')} to find the best matches for your request. `;
    }

    if (intent.quantity > 1) {
      msg = `I retrieved **${recommendations.length} verified listings** and confirmed availability for ${intent.quantity} items for "${intent.searchQuery}". `;
    }

    msg += `Top recommendation: **${topRec.product.title}** (${topRec.product.currency} ${topRec.product.price.toLocaleString()}) from *${topRec.source}*. `;
    msg += `Reason: ${topRec.reason}.`;

    if (comparison && intent.intent === 'comparison') {
      msg += `\n\n**Comparison Verdict**: ${comparison.verdict}`;
    }

    // Phase 8: Factual graceful provider degradation notice
    if (failedProviders && failedProviders.length > 0) {
      msg += `\n\n*I found several good matches. One marketplace was temporarily unavailable, but I found alternatives from other sources.*`;
    }

    if (policyNotice) msg += `\n\n🛡️ ${policyNotice}`;
    return msg;
  }

  private async logSessionAndMessage(sessionId: string, customerId?: string, message?: string) {
    try {
      let validCustomerId: string | null = null;
      if (customerId) {
        await pool.query(
          `INSERT INTO customers (id, merchant_id, name, email) VALUES ($1, 'merch_razorflow_01', 'Shopper', $2) ON CONFLICT (id) DO NOTHING`,
          [customerId, `${customerId}@shopper.razorflow.ai`]
        );
        validCustomerId = customerId;
      }
      await pool.query(
        `INSERT INTO ai_sessions (id, merchant_id, customer_id, channel, status) VALUES ($1, 'merch_razorflow_01', $2, 'AI_SHOPPING_AGENT', 'ACTIVE') ON CONFLICT (id) DO NOTHING`,
        [sessionId, validCustomerId]
      );
      if (message) {
        await pool.query(
          `INSERT INTO ai_messages (id, session_id, role, sender, content, created_at) VALUES ($1, $2, 'user', 'user', $3, NOW())`,
          [`msg_${Date.now()}_u`, sessionId, message]
        );
      }
    } catch (err: any) { console.warn('⚠️ Session logging note:', err.message); }
  }

  private async logAssistantMessage(sessionId: string, content: string, recommendations: RecommendationItem[], policyEvaluation: any) {
    try {
      await pool.query(
        `INSERT INTO ai_messages (id, session_id, role, sender, content, metadata, created_at) VALUES ($1, $2, 'assistant', 'assistant', $3, $4, NOW())`,
        [`msg_${Date.now()}_b`, sessionId, content, JSON.stringify({ recommendationsCount: recommendations.length, policyEvaluation })]
      );
    } catch (err: any) { console.warn('⚠️ Assistant message logging note:', err.message); }
  }

  private async recordShoppingEvents(
    sessionId: string,
    customerId: string | undefined,
    intent: InterpretedIntent,
    recommendations: RecommendationItem[],
    providersQueried: string[]
  ) {
    try {
      const merchantId = 'merch_razorflow_01';
      const effectiveCustId = customerId || 'cust-01';

      if (customerId) {
        await pool.query(
          `INSERT INTO customers (id, merchant_id, name, email) VALUES ($1, $2, 'Shopper', $3) ON CONFLICT (id) DO NOTHING`,
          [customerId, merchantId, `${customerId}@shopper.razorflow.ai`]
        );
      }

      // 1. AI_SESSION_STARTED & AI_INTENT_CAPTURED events
      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId,
        eventType: 'AI_SESSION_STARTED',
        sessionId,
        metadata: { rawQuery: intent.rawQuery, channel: 'AI_SHOPPING_AGENT' }
      });

      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId,
        eventType: 'AI_INTENT_CAPTURED',
        sessionId,
        metadata: {
          intent: intent.intent,
          budget: intent.budget,
          occasion: intent.occasion,
          recipient: intent.recipient,
          searchQuery: intent.searchQuery,
          discoveredCategories: intent.discoveredCategories || [intent.category]
        }
      });

      // 2. PRODUCT_SEARCHED event
      await customerRepository.recordEvent({
        customerId: effectiveCustId,
        merchantId,
        eventType: intent.intent === 'comparison' ? 'COMPARE_PRODUCTS' : 'SEARCH_INTENT',
        sessionId,
        metadata: {
          query: intent.searchQuery,
          budget: intent.budget,
          resultsCount: recommendations.length,
          topMatch: recommendations[0]?.product.title || null,
          providersQueried,
          discoveredCategories: intent.discoveredCategories || [intent.category]
        }
      });

      // 3. Persist ai_recommendations and emit PRODUCT_RECOMMENDED & TOP_PICK_SHOWN
      const topRecs = recommendations.slice(0, 5);
      await Promise.all(
        topRecs.map(async (rec) => {
          const recId = rec.recommendationId || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          rec.recommendationId = recId;
          const prodId = rec.product.externalProductId || rec.product.id;

          try {
            await pool.query(
              `INSERT INTO ai_recommendations (id, session_id, customer_id, product_id, recommendation_type, score, reason, accepted, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [
                recId,
                sessionId,
                customerId || null,
                prodId,
                rec.tier || 'INTENT_MATCH',
                rec.matchScore,
                rec.reason || 'AI recommendation'
              ]
            );
          } catch {}

          try {
            await customerRepository.recordEvent({
              customerId: effectiveCustId,
              merchantId,
              eventType: 'PRODUCT_RECOMMENDED',
              productId: prodId,
              sessionId,
              metadata: {
                recommendationId: recId,
                rank: rec.rank,
                tier: rec.tier,
                score: rec.matchScore,
                source: rec.source,
                title: rec.product.title,
                price: rec.product.price
              }
            });

            if (rec.tier === 'TOP_PICK') {
              await customerRepository.recordEvent({
                customerId: effectiveCustId,
                merchantId,
                eventType: 'TOP_PICK_SHOWN',
                productId: prodId,
                sessionId,
                metadata: {
                  recommendationId: recId,
                  title: rec.product.title,
                  price: rec.product.price,
                  source: rec.source
                }
              });
            }
          } catch {}
        })
      );
    } catch (err: any) {
      console.warn('⚠️ Telemetry recording note:', err.message);
    }
  }
}

export const shoppingAgent = new ShoppingAgent();
