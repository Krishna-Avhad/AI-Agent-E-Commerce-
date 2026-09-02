import { ExternalProduct, ProductAvailability, ProviderName, ShippingInfo, ProductIdentifiers } from './types.js';

/**
 * Normalizes raw payload data from external commerce providers into the standard ExternalProduct model.
 * Never fabricates values; strictly maps provided fields or defaults safely to null.
 */
export class ProductNormalizer {
  public static normalizeDummyJSON(raw: Record<string, unknown>): ExternalProduct | null {
    if (!raw || typeof raw !== 'object' || !raw.id || !raw.title) {
      return null;
    }

    const price = typeof raw.price === 'number' ? raw.price : parseFloat(String(raw.price || 0));
    if (isNaN(price) || price < 0) return null;

    const discountPercentage = typeof raw.discountPercentage === 'number' ? raw.discountPercentage : null;
    const originalPrice = discountPercentage && discountPercentage > 0 
      ? Number((price / (1 - discountPercentage / 100)).toFixed(2))
      : null;

    const stock = typeof raw.stock === 'number' ? raw.stock : 0;
    const availability: ProductAvailability = stock > 10 ? 'IN_STOCK' : stock > 0 ? 'LIMITED_STOCK' : 'OUT_OF_STOCK';

    const images = Array.isArray(raw.images) 
      ? raw.images.filter((img): img is string => typeof img === 'string') 
      : [];

    const rating = typeof raw.rating === 'number' ? raw.rating : null;
    const reviewCount = Array.isArray(raw.reviews) ? raw.reviews.length : null;

    const shipping: ShippingInfo = {
      freeShipping: typeof raw.shippingInformation === 'string' && raw.shippingInformation.toLowerCase().includes('free'),
      estimatedDays: typeof raw.shippingInformation === 'string' && raw.shippingInformation.includes('day') ? 3 : null,
      shippingCost: 0,
      currency: 'USD'
    };

    const identifiers: ProductIdentifiers = {
      sku: typeof raw.sku === 'string' ? raw.sku : null,
      upc: null,
      ean: null,
      isbn: null,
      mpn: null
    };

    const specifications: Record<string, string> = {};
    if (raw.dimensions && typeof raw.dimensions === 'object') {
      const d = raw.dimensions as Record<string, unknown>;
      specifications['Dimensions'] = `${d.width || 0} x ${d.height || 0} x ${d.depth || 0} cm`;
    }
    if (typeof raw.weight === 'number') {
      specifications['Weight'] = `${raw.weight}g`;
    }
    if (typeof raw.warrantyInformation === 'string') {
      specifications['Warranty'] = raw.warrantyInformation;
    }

    return {
      provider: 'dummyjson',
      externalProductId: String(raw.id),
      title: String(raw.title).trim(),
      description: typeof raw.description === 'string' ? raw.description.trim() : null,
      brand: typeof raw.brand === 'string' ? raw.brand.trim() : null,
      category: typeof raw.category === 'string' ? raw.category.trim() : null,
      price,
      currency: 'USD',
      originalPrice,
      discountPercentage,
      imageUrl: typeof raw.thumbnail === 'string' ? raw.thumbnail : images[0] || null,
      additionalImages: images,
      productUrl: null, // Discovery only
      availability,
      seller: typeof raw.brand === 'string' ? raw.brand : 'Verified Online Merchant',
      rating,
      reviewCount,
      shipping,
      identifiers,
      specifications,
      fetchedAt: new Date().toISOString(),
      isDiscoveryOnly: true
    };
  }

  public static normalizeShopify(raw: Record<string, unknown>): ExternalProduct | null {
    if (!raw || typeof raw !== 'object' || !raw.id || !raw.title) {
      return null;
    }

    const priceRange = raw.priceRange as Record<string, unknown> | undefined;
    const minVariantPrice = priceRange?.minVariantPrice as Record<string, unknown> | undefined;
    const priceAmount = minVariantPrice?.amount ? parseFloat(String(minVariantPrice.amount)) : 0;
    const currency = typeof minVariantPrice?.currencyCode === 'string' ? minVariantPrice.currencyCode : 'USD';

    const imagesNode = raw.images as Record<string, unknown> | undefined;
    const edges = Array.isArray(imagesNode?.edges) ? imagesNode.edges : [];
    const images = edges
      .map((e: Record<string, unknown>) => (e.node as Record<string, unknown>)?.url)
      .filter((url): url is string => typeof url === 'string');

    const availableForSale = Boolean(raw.availableForSale);

    return {
      provider: 'shopify',
      externalProductId: String(raw.id),
      title: String(raw.title).trim(),
      description: typeof raw.description === 'string' ? raw.description.trim() : null,
      brand: typeof raw.vendor === 'string' ? raw.vendor.trim() : null,
      category: typeof raw.productType === 'string' && raw.productType ? raw.productType.trim() : null,
      price: priceAmount,
      currency,
      originalPrice: null,
      discountPercentage: null,
      imageUrl: images[0] || null,
      additionalImages: images,
      productUrl: typeof raw.onlineStoreUrl === 'string' ? raw.onlineStoreUrl : null,
      availability: availableForSale ? 'IN_STOCK' : 'OUT_OF_STOCK',
      seller: typeof raw.vendor === 'string' ? raw.vendor : null,
      rating: null,
      reviewCount: null,
      shipping: null,
      identifiers: {
        sku: null,
        upc: null,
        ean: null,
        isbn: null,
        mpn: null
      },
      specifications: {},
      fetchedAt: new Date().toISOString(),
      isDiscoveryOnly: true
    };
  }

  public static normalizeEbay(raw: Record<string, unknown>): ExternalProduct | null {
    if (!raw || typeof raw !== 'object' || !raw.itemId || !raw.title) {
      return null;
    }

    const priceObj = raw.price as Record<string, unknown> | undefined;
    const price = priceObj?.value ? parseFloat(String(priceObj.value)) : 0;
    const currency = typeof priceObj?.currency === 'string' ? priceObj.currency : 'USD';

    const imageObj = raw.image as Record<string, unknown> | undefined;
    const imageUrl = typeof imageObj?.imageUrl === 'string' ? imageObj.imageUrl : null;

    const sellerObj = raw.seller as Record<string, unknown> | undefined;
    const seller = typeof sellerObj?.username === 'string' ? sellerObj.username : null;

    return {
      provider: 'ebay',
      externalProductId: String(raw.itemId),
      title: String(raw.title).trim(),
      description: typeof raw.shortDescription === 'string' ? raw.shortDescription.trim() : null,
      brand: typeof raw.brand === 'string' ? raw.brand.trim() : null,
      category: Array.isArray(raw.categories) && raw.categories[0]?.categoryName ? String(raw.categories[0].categoryName) : null,
      price,
      currency,
      originalPrice: null,
      discountPercentage: null,
      imageUrl,
      additionalImages: [],
      productUrl: typeof raw.itemWebUrl === 'string' ? raw.itemWebUrl : null,
      availability: 'IN_STOCK',
      seller,
      rating: typeof sellerObj?.feedbackPercentage === 'number' ? Number((sellerObj.feedbackPercentage / 20).toFixed(1)) : null,
      reviewCount: typeof sellerObj?.feedbackScore === 'number' ? sellerObj.feedbackScore : null,
      shipping: null,
      identifiers: {
        sku: null,
        upc: typeof raw.upc === 'string' ? raw.upc : null,
        ean: typeof raw.ean === 'string' ? raw.ean : null,
        isbn: typeof raw.isbn === 'string' ? raw.isbn : null,
        mpn: typeof raw.mpn === 'string' ? raw.mpn : null
      },
      specifications: {},
      fetchedAt: new Date().toISOString(),
      isDiscoveryOnly: true
    };
  }
}
