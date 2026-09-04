import { ProductCache } from '../externalCommerce/productCache.js';
import type { ExternalProduct } from '../externalCommerce/types.js';

export class ExternalProductRepository {
  private cache = new ProductCache();

  /**
   * Fetch cached external product by provider and external ID
   */
  async get(provider: string, externalProductId: string): Promise<ExternalProduct | null> {
    return this.cache.getCachedProduct(provider, externalProductId);
  }

  /**
   * Save external products to persistent cache
   */
  async setMany(products: ExternalProduct[]): Promise<void> {
    return this.cache.cacheProducts(products);
  }

  /**
   * Clean expired cache records
   */
  async purgeExpired(): Promise<number> {
    return this.cache.purgeExpired();
  }
}
