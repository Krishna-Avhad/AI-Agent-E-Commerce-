import { ProductNormalizer } from '../productNormalizer.js';
import { ProductSearchService } from '../productSearch.js';
import { ProviderRegistry } from '../providerRegistry.js';
import { ProductCache } from '../productCache.js';
import { CommerceProvider, ExternalProduct, ProductSearchQuery } from '../types.js';
import { migrateExternalCommerceSchema } from '../migration.js';

class MockFailingProvider implements CommerceProvider {
  public readonly name = 'shopify' as const;
  public isConfigured(): boolean { return true; }
  public async searchProducts(_query: ProductSearchQuery): Promise<ExternalProduct[]> {
    throw new Error('Shopify rate limit exceeded (HTTP 429)');
  }
  public async getProduct(_id: string): Promise<ExternalProduct | null> {
    throw new Error('Shopify endpoint unreachable');
  }
}

class MockWorkingProvider implements CommerceProvider {
  public readonly name = 'dummyjson' as const;
  public isConfigured(): boolean { return true; }
  public async searchProducts(query: ProductSearchQuery): Promise<ExternalProduct[]> {
    return [
      {
        provider: 'dummyjson',
        externalProductId: 'mock-101',
        title: `${query.query} Wireless ANC Headphone`,
        description: 'Premium active noise cancelling studio gear',
        brand: 'AcousticTech',
        category: 'Audio',
        price: 199.99,
        currency: 'USD',
        originalPrice: 249.99,
        discountPercentage: 20,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        additionalImages: [],
        productUrl: null,
        availability: 'IN_STOCK',
        seller: 'AcousticTech Direct',
        rating: 4.8,
        reviewCount: 42,
        shipping: { freeShipping: true, estimatedDays: 2, shippingCost: 0, currency: 'USD' },
        identifiers: { sku: 'SKU-AC-101', upc: null, ean: null, isbn: null, mpn: null },
        specifications: { Battery: '40 hours', Bluetooth: '5.3' },
        fetchedAt: new Date().toISOString(),
        isDiscoveryOnly: true
      },
      // Duplicate entry to test deduplication
      {
        provider: 'dummyjson',
        externalProductId: 'mock-101',
        title: `${query.query} Wireless ANC Headphone Duplicate`,
        description: 'Duplicate listing',
        brand: 'AcousticTech',
        category: 'Audio',
        price: 199.99,
        currency: 'USD',
        originalPrice: 249.99,
        discountPercentage: 20,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        additionalImages: [],
        productUrl: null,
        availability: 'IN_STOCK',
        seller: 'AcousticTech Direct',
        rating: 4.8,
        reviewCount: 42,
        shipping: null,
        identifiers: { sku: 'SKU-AC-101', upc: null, ean: null, isbn: null, mpn: null },
        specifications: {},
        fetchedAt: new Date().toISOString(),
        isDiscoveryOnly: true
      }
    ];
  }
  public async getProduct(id: string): Promise<ExternalProduct | null> {
    if (id === 'mock-101') {
      const results = await this.searchProducts({ query: 'Wireless' });
      return results[0];
    }
    return null;
  }
}

async function runExternalCommerceTestSuite() {
  console.log('🧪 ==============================================================================');
  console.log('🧪 RAZORFLOW EXTERNAL COMMERCE: PHASE 2 TEST & VERIFICATION SUITE');
  console.log('🧪 ==============================================================================\n');

  let passed = 0;
  let failed = 0;

  // Setup database migration
  try {
    await migrateExternalCommerceSchema();
  } catch (err: any) {
    console.warn('Migration note:', err.message);
  }

  // Test 1: Normalizer handles complete and missing fields cleanly (defaults to null, never fabricates)
  try {
    console.log('Test 1: ProductNormalizer - Missing & Partial Fields Handling...');
    const partialRaw = {
      id: 999,
      title: 'Minimal Gadget'
      // Missing price, brand, rating, images, etc.
    };
    const normalized = ProductNormalizer.normalizeDummyJSON(partialRaw);
    if (
      normalized &&
      normalized.title === 'Minimal Gadget' &&
      normalized.price === 0 &&
      normalized.brand === null &&
      normalized.rating === null &&
      normalized.reviewCount === null &&
      normalized.isDiscoveryOnly === true
    ) {
      console.log('  ✅ PASSED: Correctly mapped missing fields to null without fabricating values.');
      passed++;
    } else {
      throw new Error(`Normalization error: ${JSON.stringify(normalized)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 2: Normalizer rejects invalid/corrupt payloads
  try {
    console.log('\nTest 2: ProductNormalizer - Invalid Payload Rejection...');
    const corruptPayload = { id: null, title: '' };
    const res = ProductNormalizer.normalizeDummyJSON(corruptPayload as any);
    if (res === null) {
      console.log('  ✅ PASSED: Rejected invalid payload with null.');
      passed++;
    } else {
      throw new Error('Expected null for corrupt payload');
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 3: Search Query Validation (Empty query, minPrice > maxPrice)
  try {
    console.log('\nTest 3: Search Query Validation...');
    const service = new ProductSearchService();
    let caughtEmpty = false;
    try {
      service.validateQuery({ query: '   ' });
    } catch (e: any) {
      if (e.code === 'INVALID_SEARCH_QUERY') caughtEmpty = true;
    }

    let caughtPriceRange = false;
    try {
      service.validateQuery({ query: 'laptop', minPrice: 500, maxPrice: 100 });
    } catch (e: any) {
      if (e.code === 'INVALID_SEARCH_QUERY') caughtPriceRange = true;
    }

    if (caughtEmpty && caughtPriceRange) {
      console.log('  ✅ PASSED: Rejected empty query and inverted price ranges.');
      passed++;
    } else {
      throw new Error(`Validation failed. empty=${caughtEmpty}, priceRange=${caughtPriceRange}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 4: Provider Failure Graceful Degradation & Deduplication
  try {
    console.log('\nTest 4: Provider Failure Graceful Degradation & Deduplication...');
    const registry = new ProviderRegistry();
    // Replace providers with mock working + mock failing
    (registry as any).providers = new Map();
    registry.registerProvider(new MockWorkingProvider());
    registry.registerProvider(new MockFailingProvider());

    const service = new ProductSearchService(registry, new ProductCache());
    const result = await service.search({ query: 'NoiseCancelling' });

    if (
      result.products.length === 1 && // Deduplicated from 2 to 1
      result.products[0].externalProductId === 'mock-101' &&
      result.failedProviders.length === 1 &&
      result.failedProviders[0].provider === 'shopify'
    ) {
      console.log('  ✅ PASSED: Handled failing provider gracefully while deduplicating working provider results.');
      passed++;
    } else {
      throw new Error(`Unexpected search result structure: ${JSON.stringify(result)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 5: Supabase Caching (external_products table write and read)
  try {
    console.log('\nTest 5: Supabase Persistent Product Caching...');
    const cache = new ProductCache();
    const testProduct: ExternalProduct = {
      provider: 'dummyjson',
      externalProductId: `test_sku_${Date.now()}`,
      title: 'Precision Mechanical Keyboard',
      description: 'Hot-swappable switches with gasket mount',
      brand: 'KeyForge',
      category: 'Workstation',
      price: 149.00,
      currency: 'USD',
      originalPrice: 179.00,
      discountPercentage: 16.7,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
      additionalImages: [],
      productUrl: null,
      availability: 'IN_STOCK',
      seller: 'KeyForge Official',
      rating: 4.9,
      reviewCount: 128,
      shipping: { freeShipping: true, estimatedDays: 3, shippingCost: 0, currency: 'USD' },
      identifiers: { sku: 'KF-MK-01', upc: null, ean: null, isbn: null, mpn: null },
      specifications: { Layout: '75%', Switches: 'Gateron Oil King' },
      fetchedAt: new Date().toISOString(),
      isDiscoveryOnly: true
    };

    await cache.cacheProduct(testProduct);
    const retrieved = await cache.getCachedProduct('dummyjson', testProduct.externalProductId);

    if (retrieved && retrieved.title === testProduct.title && retrieved.price === 149.00) {
      console.log(`  ✅ PASSED: Successfully cached and retrieved external product from Supabase: ${retrieved.title}`);
      passed++;
    } else {
      throw new Error(`Cache lookup failed for ${testProduct.externalProductId}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  // Test 6: Live Open Commerce API Query (Real HTTP Network Call)
  try {
    console.log('\nTest 6: Live Online Product Discovery Query...');
    const defaultService = new ProductSearchService();
    const liveResults = await defaultService.search({ query: 'phone', limit: 5 });
    if (liveResults.products.length > 0 && liveResults.products[0].isDiscoveryOnly) {
      console.log(`  ✅ PASSED: Retrieved ${liveResults.products.length} live online products (Sample: "${liveResults.products[0].title}", Price: $${liveResults.products[0].price}) in ${liveResults.executionTimeMs}ms.`);
      passed++;
    } else {
      throw new Error(`Live search returned 0 items: ${JSON.stringify(liveResults)}`);
    }
  } catch (e: any) {
    console.error('  ❌ FAILED:', e.message);
    failed++;
  }

  console.log('\n==============================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==============================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runExternalCommerceTestSuite();
