/**
 * Unified types for External Commerce Product Discovery
 * Strict TypeScript without 'any'.
 */

export type ProviderName = 'linqs' | 'shopify' | 'ebay' | 'opencatalog' | 'dummyjson';

export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'PRE_ORDER' | 'UNKNOWN';

export interface ShippingInfo {
  freeShipping: boolean;
  estimatedDays: number | null;
  shippingCost: number | null;
  currency: string | null;
}

export interface ProductIdentifiers {
  sku: string | null;
  upc: string | null;
  ean: string | null;
  isbn: string | null;
  mpn: string | null;
}

export interface ExternalProduct {
  provider: ProviderName;
  externalProductId: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  price: number;
  currency: string;
  originalPrice: number | null;
  discountPercentage: number | null;
  imageUrl: string | null;
  additionalImages: string[];
  productUrl: string | null;
  availability: ProductAvailability;
  seller: string | null;
  rating: number | null;
  reviewCount: number | null;
  shipping: ShippingInfo | null;
  identifiers: ProductIdentifiers;
  specifications: Record<string, string>;
  fetchedAt: string;
  isDiscoveryOnly: true; // Explicitly marks item as discovery product (not directly Razorpay merchant inventory)
}

export interface ProductSearchQuery {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  limit?: number;
}

export interface ProductSearchResult {
  query: ProductSearchQuery;
  totalResults: number;
  providersQueried: ProviderName[];
  failedProviders: Array<{ provider: ProviderName; error: string }>;
  products: ExternalProduct[];
  cachedCount: number;
  executionTimeMs: number;
}

export interface CommerceProvider {
  name: ProviderName;
  isConfigured(): boolean;
  searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]>;
  getProduct(externalId: string): Promise<ExternalProduct | null>;
}
