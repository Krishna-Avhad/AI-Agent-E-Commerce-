export type PortalMode = 'shopper' | 'merchant';

export type ShopperRoute = 
  | 'home' 
  | 'catalog' 
  | 'product-detail' 
  | 'compare' 
  | 'bundles' 
  | 'cart' 
  | 'checkout' 
  | 'order-success' 
  | 'order-detail';

export type MerchantRoute = 
  | 'overview' 
  | 'products' 
  | 'orders' 
  | 'bundles' 
  | 'analytics' 
  | 'intent-analytics' 
  | 'ai-readiness' 
  | 'agent-commerce' 
  | 'mcp-integration' 
  | 'audit-trail' 
  | 'audit-timeline' 
  | 'system-status';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  gallery?: string[];
  description: string;
  aiMatchScore: number; // e.g. 98
  aiMatchReason: string;
  tags: string[];
  inStock: boolean;
  stockCount: number;
  sku: string;
  specs: Record<string, string>;
  aiReadinessScore: number; // 0-100
  vectorEmbeddingStatus: 'synced' | 'pending' | 'outdated';
  brand: string;
  featured?: boolean;
}

export interface BundleItem {
  id: string;
  title: string;
  description: string;
  tagline: string;
  matchScore: number;
  originalTotal: number;
  bundlePrice: number;
  savingsPercentage: number;
  category: string;
  products: Product[];
  curatedReason: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedStorage?: string;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Flagged by AI';
  paymentMethod: 'Razorpay UPI' | 'Razorpay Card' | 'Instant Settlement' | 'Agent-to-Agent Protocol' | 'Razorpay Test Mode';
  paymentStatus: 'Paid' | 'Settling' | 'Pending' | 'Refunded' | 'Failed';
  channel: 'Direct Consumer' | 'Agent-to-Agent' | 'MCP API' | 'Voice Assistant';
  trackingNumber?: string;
  estimatedDelivery?: string;
  aiConfidenceScore?: number;
  auditId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'Customer' | 'AI Agent' | 'Merchant Admin' | 'MCP Protocol' | 'Razorpay Gateway';
  action: string;
  entityType: 'Order' | 'Product' | 'Cart' | 'Auth' | 'VectorDB' | 'Payment';
  entityId: string;
  status: 'Success' | 'Warning' | 'Blocked' | 'Pending';
  riskScore: 'Low' | 'Medium' | 'High';
  latencyMs: number;
  ipAddress: string;
  details: string;
  payloadJson?: Record<string, any>;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'Catalog' | 'Inventory' | 'Payment' | 'Fulfillment' | 'Compliance';
  version: string;
  endpoint: string;
  status: 'active' | 'degraded' | 'inactive';
  callsLast24h: number;
  avgLatencyMs: number;
  successRate: number;
  schemaInput: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: {
    label: string;
    actionType: 'view_product' | 'view_bundle' | 'add_to_cart' | 'compare_products';
    payload?: any;
  }[];
  productSuggestions?: Product[];
}
