import { CommerceProvider, ProviderName } from './types.js';
import { DummyJsonProvider } from './providers/dummyJsonProvider.js';
import { ShopifyStorefrontProvider } from './providers/shopifyStorefrontProvider.js';
import { EbayBrowseProvider } from './providers/ebayBrowseProvider.js';

export class ProviderRegistry {
  private providers: Map<ProviderName, CommerceProvider> = new Map();

  constructor() {
    this.registerProvider(new DummyJsonProvider());
    this.registerProvider(new ShopifyStorefrontProvider());
    this.registerProvider(new EbayBrowseProvider());
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
