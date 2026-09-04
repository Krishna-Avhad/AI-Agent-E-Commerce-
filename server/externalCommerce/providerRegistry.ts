import { CommerceProvider, ProviderName } from './types.js';
import { LinqsProvider } from './providers/linqsProvider.js';
import { EbayBrowseProvider } from './providers/ebayBrowseProvider.js';
import { ShopifyStorefrontProvider } from './providers/shopifyStorefrontProvider.js';
import { DummyJsonProvider } from './providers/dummyJsonProvider.js';

export class ProviderRegistry {
  private providers: Map<ProviderName, CommerceProvider> = new Map();

  constructor() {
    // Priority order:
    // 1. LINQS (REAL, Free, No credentials required)
    // 2. eBay Browse (REAL, requires client credentials)
    // 3. Shopify Storefront (REAL, requires storefront token)
    this.registerProvider(new LinqsProvider());
    this.registerProvider(new EbayBrowseProvider());
    this.registerProvider(new ShopifyStorefrontProvider());
    // DummyJSON removed per Phase 3 requirement to not use synthetic products.
  }

  public registerProvider(provider: CommerceProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: ProviderName): CommerceProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): CommerceProvider[] {
    return Array.from(this.providers.values());
  }

  public getConfiguredProviders(): CommerceProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isConfigured());
  }
}
