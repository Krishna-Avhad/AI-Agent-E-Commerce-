import { pool } from '../db.js';
import { ExternalProduct } from './types.js';

export class ProductCache {
  private readonly defaultTtlHours = 24;

  public async getCachedProduct(provider: string, externalId: string): Promise<ExternalProduct | null> {
    try {
      const res = await pool.query(
        `SELECT normalized_data FROM external_products 
         WHERE provider = $1 AND external_product_id = $2 AND expires_at > NOW()
         LIMIT 1`,
        [provider, externalId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0].normalized_data as ExternalProduct;
    } catch (err: unknown) {
      console.warn('⚠️ Cache read warning:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  public async searchCachedProducts(query: string, limit = 20): Promise<ExternalProduct[]> {
    try {
      const res = await pool.query(
        `SELECT normalized_data FROM external_products 
         WHERE (title ILIKE $1 OR category ILIKE $1 OR brand ILIKE $1)
           AND expires_at > NOW()
         ORDER BY fetched_at DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      return res.rows.map((r) => r.normalized_data as ExternalProduct);
    } catch (err: unknown) {
      console.warn('⚠️ Cache search warning:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  public async cacheProduct(product: ExternalProduct): Promise<void> {
    try {
      const id = `ext_${product.provider}_${product.externalProductId}`;
      await pool.query(
        `INSERT INTO external_products (
          id, provider, external_product_id, title, brand, category,
          price, currency, image_url, product_url, availability,
          rating, review_count, normalized_data, fetched_at, expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, NOW(), NOW() + INTERVAL '${this.defaultTtlHours} HOURS'
        )
        ON CONFLICT (provider, external_product_id) DO UPDATE SET
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          availability = EXCLUDED.availability,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          normalized_data = EXCLUDED.normalized_data,
          fetched_at = NOW(),
          expires_at = NOW() + INTERVAL '${this.defaultTtlHours} HOURS'`,
        [
          id,
          product.provider,
          product.externalProductId,
          product.title,
          product.brand,
          product.category,
          product.price,
          product.currency,
          product.imageUrl,
          product.productUrl,
          product.availability,
          product.rating,
          product.reviewCount,
          JSON.stringify(product)
        ]
      );

      // Snapshot price history
      const snapId = `snap_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      await pool.query(
        `INSERT INTO external_product_snapshots (
          id, external_product_id, price, currency, availability, snapshot_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          snapId,
          id,
          product.price,
          product.currency,
          product.availability,
          JSON.stringify({ price: product.price, title: product.title })
        ]
      );
    } catch (err: unknown) {
      console.warn('⚠️ Cache write warning:', err instanceof Error ? err.message : err);
    }
  }

  public async cacheMany(products: ExternalProduct[]): Promise<void> {
    for (const product of products) {
      await this.cacheProduct(product);
    }
  }
}
