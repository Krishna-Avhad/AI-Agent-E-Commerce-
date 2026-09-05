import { USD_TO_INR_RATE } from '../constants.js';
import { ExternalProduct, ProductAvailability, ProviderName, ShippingInfo, ProductIdentifiers } from './types.js';

/**
 * Normalizes raw payload data from external commerce providers into the standard ExternalProduct model.
 * Never fabricates values; strictly maps provided fields or defaults safely to null.
 */
export class ProductNormalizer {
  private static applyCurrencyConversion(product: ExternalProduct): ExternalProduct {
    if (product.currency === 'USD') {
      product.price = Math.round(product.price * USD_TO_INR_RATE);
      if (product.originalPrice !== null && product.originalPrice !== undefined) {
        product.originalPrice = Math.round(product.originalPrice * USD_TO_INR_RATE);
      }
      product.currency = 'INR';
    }
    return product;
  }

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

    return ProductNormalizer.applyCurrencyConversion({
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
    });
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

    return ProductNormalizer.applyCurrencyConversion({
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
    });
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

    return ProductNormalizer.applyCurrencyConversion({
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
    });
  }

  public static normalizeLinqs(raw: Record<string, unknown>): ExternalProduct | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const title = typeof raw.name === 'string' ? raw.name : (typeof raw.title === 'string' ? raw.title : null);
    const id = raw.id ? String(raw.id) : (raw.databaseId ? String(raw.databaseId) : (raw.slug ? String(raw.slug) : null));

    if (!id || !title) {
      return null;
    }

    let price = 0;
    if (typeof raw.price_from === 'number') {
      price = raw.price_from;
    } else if (raw.price !== undefined) {
      const pStr = String(raw.price).replace(/,/g, '');
      const match = pStr.match(/\d+(?:\.\d+)?/);
      price = match ? parseFloat(match[0]) : 0;
    }

    let originalPrice: number | null = null;
    if (raw.regularPrice) {
      const regStr = String(raw.regularPrice).replace(/,/g, '');
      const regMatch = regStr.match(/\d+(?:\.\d+)?/);
      if (regMatch) {
        const parsedReg = parseFloat(regMatch[0]);
        if (parsedReg > price) originalPrice = parsedReg;
      }
    }

    const currency = typeof raw.price_currency === 'string' ? raw.price_currency : 'INR';

    const rawStock = String(raw.stockStatus || raw.stock_status || '').toUpperCase();
    const availability: ProductAvailability = 
      rawStock === 'IN_STOCK' || rawStock === 'LOW_STOCK'
        ? 'IN_STOCK'
        : rawStock === 'OUT_OF_STOCK'
          ? 'OUT_OF_STOCK'
          : 'IN_STOCK';

    let imageUrl: string | null = null;
    if (raw.image && typeof raw.image === 'object' && typeof (raw.image as Record<string, unknown>).src === 'string') {
      imageUrl = (raw.image as Record<string, unknown>).src as string;
    } else if (typeof raw.imageUrl === 'string') {
      imageUrl = raw.imageUrl;
    }

    const productUrl = typeof raw.url === 'string' 
      ? raw.url 
      : (typeof raw.slug === 'string' ? `https://shop.linqs.in/product/${raw.slug}` : null);

    const category = typeof raw.category === 'string' 
      ? raw.category 
      : (typeof raw.form_factor === 'string' ? raw.form_factor : (typeof raw.formFactor === 'string' ? raw.formFactor : null));

    const specifications: Record<string, string> = {};
    if (typeof raw.chip === 'string') specifications['Chip'] = raw.chip;
    if (typeof raw.chip_family === 'string') specifications['Chip Family'] = raw.chip_family;
    if (typeof raw.size === 'string') specifications['Size'] = raw.size;
    if (typeof raw.formFactor === 'string') specifications['Form Factor'] = raw.formFactor;
    if (typeof raw.form_factor === 'string') specifications['Form Factor'] = raw.form_factor;
    if (typeof raw.memory_bytes === 'number') specifications['Memory'] = `${raw.memory_bytes} bytes`;

    const description = typeof raw.description === 'string'
      ? raw.description
      : (Array.isArray(raw.best_for) ? `Best for: ${raw.best_for.join(', ')}` : null);

    return ProductNormalizer.applyCurrencyConversion({
      provider: 'linqs',
      externalProductId: id,
      title: title.trim(),
      description,
      brand: 'LINQS',
      category,
      price,
      currency,
      originalPrice,
      discountPercentage: originalPrice && originalPrice > price ? Number((((originalPrice - price) / originalPrice) * 100).toFixed(0)) : null,
      imageUrl,
      additionalImages: imageUrl ? [imageUrl] : [],
      productUrl,
      availability,
      seller: 'LINQS Shop (Yuvera Solutions)',
      rating: null,
      reviewCount: null,
      shipping: null,
      identifiers: {
        sku: typeof raw.sku === 'string' ? raw.sku : null,
        upc: null,
        ean: null,
        isbn: null,
        mpn: null
      },
      specifications,
      fetchedAt: new Date().toISOString(),
      isDiscoveryOnly: true
    });
  }
}

