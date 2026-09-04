import { ExternalProduct, ProductSearchQuery, ProductSearchResult, ProviderName } from './types.js';
import { ProviderRegistry } from './providerRegistry.js';
import { ProductCache } from './productCache.js';
import { ExternalCommerceError } from './errors.js';

export class ProductSearchService {
  private registry: ProviderRegistry;
  private cache: ProductCache;

  constructor(registry = new ProviderRegistry(), cache = new ProductCache()) {
    this.registry = registry;
    this.cache = cache;
  }

  public validateQuery(query: ProductSearchQuery): void {
    if (!query || typeof query.query !== 'string' || query.query.trim().length === 0) {
      throw new ExternalCommerceError({
        code: 'INVALID_SEARCH_QUERY',
        message: 'Search query parameter "query" must be a non-empty string.',
        statusCode: 400
      });
    }

    if (query.minPrice !== undefined && (isNaN(query.minPrice) || query.minPrice < 0)) {
      throw new ExternalCommerceError({
        code: 'INVALID_SEARCH_QUERY',
        message: 'minPrice must be a positive number.',
        statusCode: 400
      });
    }

    if (query.maxPrice !== undefined && (isNaN(query.maxPrice) || query.maxPrice < 0)) {
      throw new ExternalCommerceError({
        code: 'INVALID_SEARCH_QUERY',
        message: 'maxPrice must be a positive number.',
        statusCode: 400
      });
    }

    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new ExternalCommerceError({
        code: 'INVALID_SEARCH_QUERY',
        message: 'minPrice cannot be greater than maxPrice.',
        statusCode: 400
      });
    }

    if (query.limit !== undefined && (isNaN(query.limit) || query.limit < 1 || query.limit > 100)) {
      throw new ExternalCommerceError({
        code: 'INVALID_SEARCH_QUERY',
        message: 'limit must be between 1 and 100.',
        statusCode: 400
      });
    }
  }

  public async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const startTime = Date.now();
    this.validateQuery(query);

    const configuredProviders = this.registry.getConfiguredProviders();
    if (configuredProviders.length === 0) {
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_NOT_CONFIGURED',
        message: 'No external commerce providers are currently configured or enabled.',
        statusCode: 503
      });
    }

    const providersQueried: ProviderName[] = [];
    const failedProviders: Array<{ provider: ProviderName; error: string }> = [];
    const allProducts: ExternalProduct[] = [];

    // Query all active providers in parallel
    const promises = configuredProviders.map(async (provider) => {
      providersQueried.push(provider.name);
      try {
        const results = await provider.searchProducts(query);
        return { success: true as const, provider: provider.name, products: results };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown provider error';
        return { success: false as const, provider: provider.name, error: errMsg };
      }
    });

    const settled = await Promise.all(promises);

    for (const res of settled) {
      if (res.success) {
        allProducts.push(...res.products);
      } else {
        failedProviders.push({ provider: res.provider, error: res.error });
      }
    }

    // Deduplicate items
    // Priority: SKU ↓ provider product ID ↓ normalized brand + model ↓ carefully normalized title
    const seen = new Set<string>();
    const deduplicated: ExternalProduct[] = [];

    for (const p of allProducts) {
      const sku = p.identifiers?.sku ? `sku:${p.identifiers.sku}` : null;
      const pid = `id:${p.provider}:${p.externalProductId}`;
      const titleNorm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const brandModel = (p.brand && p.title) ? `bm:${p.brand.toLowerCase()}:${titleNorm}` : null;
      
      const titleKey = `title:${titleNorm}`;

      // We only consider it unique if none of its available identifiers have been seen
      const hasSku = sku && seen.has(sku);
      const hasPid = seen.has(pid);
      const hasBrandModel = brandModel && seen.has(brandModel);
      const hasTitle = seen.has(titleKey);

      if (!hasSku && !hasPid && !hasBrandModel && !hasTitle) {
        if (sku) seen.add(sku);
        seen.add(pid);
        if (brandModel) seen.add(brandModel);
        seen.add(titleKey);
        deduplicated.push(p);
      }
    }

    // Cache results in background
    if (deduplicated.length > 0) {
      this.cache.cacheMany(deduplicated).catch((err) => {
        console.warn('⚠️ Background cache error:', err);
      });
    }

    const limit = query.limit || 20;
    const finalProducts = deduplicated.slice(0, limit);

    return {
      query,
      totalResults: finalProducts.length,
      providersQueried,
      failedProviders,
      products: finalProducts,
      cachedCount: 0,
      executionTimeMs: Date.now() - startTime
    };
  }

  public async getProduct(providerName: ProviderName, externalId: string): Promise<ExternalProduct | null> {
    // 1. Check cache first
    const cached = await this.cache.getCachedProduct(providerName, externalId);
    if (cached) return cached;

    // 2. Query provider
    const provider = this.registry.getProvider(providerName);
    if (!provider || !provider.isConfigured()) {
      return null;
    }

    const product = await provider.getProduct(externalId);
    if (product) {
      await this.cache.cacheProduct(product);
    }
    return product;
  }
}
