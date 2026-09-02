import { CommerceProvider, ExternalProduct, ProductSearchQuery } from '../types.js';
import { ProductNormalizer } from '../productNormalizer.js';
import { ExternalCommerceError } from '../errors.js';

export class EbayBrowseProvider implements CommerceProvider {
  public readonly name = 'ebay' as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://api.ebay.com/buy/browse/v1';

  constructor() {
    this.clientId = process.env.EBAY_CLIENT_ID || '';
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  public async searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]> {
    if (!this.isConfigured()) {
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_NOT_CONFIGURED',
        provider: this.name,
        message: 'eBay Browse provider is not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.'
      });
    }

    try {
      // In production, fetch OAuth app token using client_credentials grant
      const token = await this.getOAuthToken();
      const url = new URL(`${this.baseUrl}/item_summary/search`);
      url.searchParams.set('q', query.query);
      url.searchParams.set('limit', String(query.limit || 20));

      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        const priceFilter: string[] = [];
        if (query.minPrice !== undefined) priceFilter.push(`price:[${query.minPrice}`);
        if (query.maxPrice !== undefined) priceFilter.push(`${query.maxPrice}]`);
        if (priceFilter.length > 0) url.searchParams.set('filter', priceFilter.join('..'));
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new ExternalCommerceError({
          code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
          provider: this.name,
          message: `eBay API HTTP ${response.status}: ${response.statusText}`
        });
      }

      const json = await response.json() as { itemSummaries?: Record<string, unknown>[] };
      const items = json.itemSummaries || [];
      return items
        .map((i) => ProductNormalizer.normalizeEbay(i))
        .filter((p): p is ExternalProduct => p !== null);
    } catch (err: unknown) {
      if (err instanceof ExternalCommerceError) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown eBay API error';
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
        provider: this.name,
        message: `Failed to query eBay Browse API: ${msg}`
      });
    }
  }

  public async getProduct(externalId: string): Promise<ExternalProduct | null> {
    if (!this.isConfigured()) return null;

    try {
      const token = await this.getOAuthToken();
      const response = await fetch(`${this.baseUrl}/item/${encodeURIComponent(externalId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Accept': 'application/json'
        }
      });

      if (response.status === 404) return null;
      if (!response.ok) return null;

      const raw = await response.json() as Record<string, unknown>;
      return ProductNormalizer.normalizeEbay(raw);
    } catch {
      return null;
    }
  }

  private async getOAuthToken(): Promise<string> {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
    });

    if (!res.ok) {
      throw new Error(`Failed to obtain eBay OAuth token: HTTP ${res.status}`);
    }

    const data = await res.json() as { access_token?: string };
    if (!data.access_token) {
      throw new Error('eBay OAuth token response did not contain access_token');
    }

    return data.access_token;
  }
}
