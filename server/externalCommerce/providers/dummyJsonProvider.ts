import { CommerceProvider, ExternalProduct, ProductSearchQuery } from '../types.js';
import { ProductNormalizer } from '../productNormalizer.js';
import { ExternalCommerceError } from '../errors.js';

export class DummyJsonProvider implements CommerceProvider {
  public readonly name = 'dummyjson' as const;
  private readonly baseUrl = 'https://dummyjson.com/products';

  public isConfigured(): boolean {
    // Strictly classified as DEMO / TEST provider.
    // Active only when explicitly enabled for prototyping or automated tests.
    return process.env.ALLOW_DEMO_COMMERCE_PROVIDER === 'true' || process.env.NODE_ENV === 'test';
  }

  public async searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]> {
    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('q', query.query);
      if (query.limit) {
        url.searchParams.set('limit', String(Math.min(query.limit, 50)));
      } else {
        url.searchParams.set('limit', '20');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalCommerceError({
          code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
          provider: this.name,
          message: `DummyJSON HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status
        });
      }

      const data = await response.json() as { products?: unknown[] };
      if (!data || !Array.isArray(data.products)) {
        return [];
      }

      const normalized = data.products
        .map((p) => ProductNormalizer.normalizeDummyJSON(p as Record<string, unknown>))
        .filter((p): p is ExternalProduct => p !== null);

      // Apply client filtering if requested (minPrice, maxPrice, category)
      return normalized.filter((p) => {
        if (query.minPrice !== undefined && p.price < query.minPrice) return false;
        if (query.maxPrice !== undefined && p.price > query.maxPrice) return false;
        if (query.category && p.category && !p.category.toLowerCase().includes(query.category.toLowerCase())) {
          return false;
        }
        return true;
      });
    } catch (err: unknown) {
      if (err instanceof ExternalCommerceError) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown provider error';
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
        provider: this.name,
        message: `Failed to query DummyJSON commerce API: ${msg}`
      });
    }
  }

  public async getProduct(externalId: string): Promise<ExternalProduct | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(externalId)}`);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new ExternalCommerceError({
          code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
          provider: this.name,
          message: `DummyJSON product lookup HTTP ${response.status}`
        });
      }

      const raw = await response.json() as Record<string, unknown>;
      return ProductNormalizer.normalizeDummyJSON(raw);
    } catch (err: unknown) {
      if (err instanceof ExternalCommerceError) throw err;
      return null;
    }
  }
}
