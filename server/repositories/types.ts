export interface CatalogQueryParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  brand?: string;
  merchantId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'name' | 'created_at' | 'ai_match_score';
  sortOrder?: 'asc' | 'desc';
}

export interface CatalogResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProductInput {
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  stockQuantity?: number;
  imageUrl?: string;
  gallery?: string[];
  brand?: string;
  sku?: string;
  featured?: boolean;
  tags?: string[];
  specs?: Record<string, string>;
  metadata?: Record<string, unknown>;
  variants?: Array<{
    name: string;
    sku?: string;
    price?: number;
    stockQuantity?: number;
    attributes?: Record<string, string>;
  }>;
}

export interface CustomerEventInput {
  customerId: string;
  merchantId?: string;
  eventType: string;
  productId?: string;
  sessionId?: string;
  query?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderInput {
  merchantId?: string;
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
    variantId?: string;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  total: number;
  currency?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  razorpayOrderId?: string | null;
  channel?: 'Web Store' | 'AI Agent' | 'MCP Protocol';
}

export interface PaymentRecordInput {
  merchantId?: string;
  orderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  method?: string;
  gatewayResponse?: Record<string, unknown>;
}
