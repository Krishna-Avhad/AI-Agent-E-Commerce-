import { CommerceProvider, ExternalProduct, ProductSearchQuery } from '../types.js';
import { ProductNormalizer } from '../productNormalizer.js';
import { ExternalCommerceError } from '../errors.js';

export class ShopifyStorefrontProvider implements CommerceProvider {
  public readonly name = 'shopify' as const;
  private readonly storeDomain: string;
  private readonly storefrontToken: string;

  constructor() {
    this.storeDomain = process.env.SHOPIFY_STORE_DOMAIN || '';
    this.storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.storeDomain && this.storefrontToken);
  }

  public async searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]> {
    if (!this.isConfigured()) {
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_NOT_CONFIGURED',
        provider: this.name,
        message: 'Shopify Storefront provider is not configured. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.'
      });
    }

    const graphqlQuery = `
      query searchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              description
              vendor
              productType
              availableForSale
              onlineStoreUrl
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 3) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const endpoint = `https://${this.storeDomain}/api/2024-01/graphql.json`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: {
            query: query.query,
            first: query.limit || 20
          }
        })
      });

      if (!response.ok) {
        throw new ExternalCommerceError({
          code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
          provider: this.name,
          message: `Shopify GraphQL HTTP ${response.status}: ${response.statusText}`
        });
      }

      const json = await response.json() as {
        data?: {
          products?: {
            edges?: Array<{ node: Record<string, unknown> }>;
          };
        };
      };

      const edges = json.data?.products?.edges || [];
      return edges
        .map((e) => ProductNormalizer.normalizeShopify(e.node))
        .filter((p): p is ExternalProduct => p !== null);
    } catch (err: unknown) {
      if (err instanceof ExternalCommerceError) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown Shopify error';
      throw new ExternalCommerceError({
        code: 'EXTERNAL_PROVIDER_UNAVAILABLE',
        provider: this.name,
        message: `Failed to query Shopify Storefront API: ${msg}`
      });
    }
  }

  public async getProduct(externalId: string): Promise<ExternalProduct | null> {
    if (!this.isConfigured()) return null;

    const graphqlQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          vendor
          productType
          availableForSale
          onlineStoreUrl
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
              }
            }
          }
        }
      }
    `;

    try {
      const endpoint = `https://${this.storeDomain}/api/2024-01/graphql.json`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { id: externalId }
        })
      });

      if (!response.ok) return null;
      const json = await response.json() as { data?: { product?: Record<string, unknown> } };
      if (!json.data?.product) return null;
      return ProductNormalizer.normalizeShopify(json.data.product);
    } catch {
      return null;
    }
  }
}
