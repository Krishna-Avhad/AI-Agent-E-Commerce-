import { CommerceProvider, ExternalProduct, ProductSearchQuery } from '../types.js';
import { ProductNormalizer } from '../productNormalizer.js';
import { ExternalCommerceError } from '../errors.js';

export class LinqsProvider implements CommerceProvider {
  public readonly name = 'linqs' as const;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private cachedCatalog: ExternalProduct[] | null = null;
  private catalogCachedAt = 0;

  constructor(baseUrl = process.env.LINQS_BASE_URL || 'https://shop.linqs.in', timeoutMs = 8000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  public isConfigured(): boolean {
    return process.env.LINQS_ENABLED !== 'false';
  }

  public async searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]> {
    if (!this.isConfigured()) {
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_NOT_CONFIGURED',
        provider: this.name,
        message: 'LINQS provider is disabled via LINQS_ENABLED=false.'
      });
    }

    const q = query.query.toLowerCase().trim();
    let normalized: ExternalProduct[] = [];

    // 1. Attempt fast /api/search query
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = new URL(`${this.baseUrl}/api/search`);
      url.searchParams.set('q', query.query);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-LINQS-API-Version': '2026-08-24',
          'User-Agent': 'RazorFlow-AI-Commerce/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json() as { products?: Record<string, unknown>[] };
        const rawProducts = Array.isArray(json.products) ? json.products : [];
        normalized = rawProducts
          .map((p) => ProductNormalizer.normalizeLinqs(p))
          .filter((p): p is ExternalProduct => p !== null);
      }
    } catch {
      // If /api/search encounters network latency, check /llms-json catalog
    }

    // 2. If /api/search returned 0 results or timed out, query the structured /llms-json agent catalog
    if (normalized.length === 0) {
      try {
        const catalog = await this.fetchAgentCatalog();
        const words = q.split(/\s+/).filter(w => w.length >= 3);
        normalized = catalog.filter((p) => {
          if (words.length === 0) return true;
          const matchTitle = words.some(w => p.title.toLowerCase().includes(w));
          const matchDesc = words.some(w => p.description?.toLowerCase().includes(w));
          const matchCategory = words.some(w => p.category?.toLowerCase().includes(w));
          const matchChip = Object.values(p.specifications).some((v) => words.some(w => v.toLowerCase().includes(w)));
          return matchTitle || matchDesc || matchCategory || matchChip;
        });
      } catch {}
    }

    // Filter price bounds
    if (query.minPrice !== undefined) {
      normalized = normalized.filter((p) => p.price >= (query.minPrice || 0));
    }
    if (query.maxPrice !== undefined) {
      normalized = normalized.filter((p) => p.price <= (query.maxPrice || Infinity));
    }

    if (query.limit && query.limit > 0) {
      normalized = normalized.slice(0, query.limit);
    }

    return normalized;
  }

  public async getProduct(externalId: string): Promise<ExternalProduct | null> {
    if (!this.isConfigured()) return null;

    try {
      // First try searching by externalId/slug
      const products = await this.searchProducts({ query: externalId, limit: 10 });
      const found = products.find((p) => p.externalProductId === externalId || p.productUrl?.includes(externalId));
      if (found) return found;

      // Also check llms-json catalog if not found
      const catalog = await this.fetchAgentCatalog();
      return catalog.find((p) => p.externalProductId === externalId) || null;
    } catch {
      return null;
    }
  }

  public async fetchAgentCatalog(): Promise<ExternalProduct[]> {
    const now = Date.now();
    if (this.cachedCatalog && now - this.catalogCachedAt < 10 * 60 * 1000) {
      return this.cachedCatalog;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/llms-json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-LINQS-API-Version': '2026-08-24',
          'User-Agent': 'RazorFlow-AI-Commerce/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) return this.cachedCatalog || [];

      const json = await response.json() as { products?: Record<string, unknown>[] };
      const rawProducts = Array.isArray(json.products) ? json.products : [];

      const normalized = rawProducts
        .map((p) => ProductNormalizer.normalizeLinqs(p))
        .filter((p): p is ExternalProduct => p !== null);

      if (normalized.length > 0) {
        this.cachedCatalog = normalized;
        this.catalogCachedAt = now;
      }

      return normalized;
    } catch {
      clearTimeout(timeoutId);
      if (this.cachedCatalog && this.cachedCatalog.length > 0) {
        return this.cachedCatalog;
      }
      try {
        const { default: catalogJson } = await import('./linqs_catalog.json', { with: { type: 'json' } });
        const raw = Array.isArray(catalogJson.products) ? catalogJson.products : [];
        this.cachedCatalog = raw
          .map((p: Record<string, unknown>) => ProductNormalizer.normalizeLinqs(p))
          .filter((p: ExternalProduct | null): p is ExternalProduct => p !== null);
        this.catalogCachedAt = now;
        return this.cachedCatalog;
      } catch {
        return [];
      }
    }
  }
}
