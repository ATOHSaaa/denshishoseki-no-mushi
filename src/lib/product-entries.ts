import type { CreatorsProduct } from './amazon';
import { affiliateUrl, productUrl } from './amazon';
import type { ProductEntry } from './product-entry';

export type { ProductEntry } from './product-entry';

const AMAZON_IMAGE_BASE =
  'https://images-fe.ssl-images-amazon.com/images/P';

export function amazonProductImageUrl(asin: string, size = 500): string {
  return `${AMAZON_IMAGE_BASE}/${asin}.09._SL${size}_.jpg`;
}

export function upgradeAmazonImageUrl(url: string, size = 800): string {
  if (!url.includes('media-amazon.com/images/I/')) {
    return url;
  }
  if (/\._AC_[A-Z]{2}\d+_\./.test(url)) {
    return url.replace(/\._AC_[A-Z]{2}\d+_\./, `._AC_SL${size}_.`);
  }
  if (/\._SL\d+_\./.test(url)) {
    return url.replace(/\._SL\d+_\./, `._SL${size}_.`);
  }
  return url;
}

export function buildFallbackProduct(entry: ProductEntry): CreatorsProduct {
  return {
    asin: entry.asin,
    title: entry.label ?? entry.asin,
    detailPageUrl: productUrl(entry.asin),
    imageUrl: entry.imageUrl ?? amazonProductImageUrl(entry.asin),
    price: entry.price,
    referencePrice: entry.referencePrice,
    savings: entry.savings,
  };
}

export function resolveProducts(
  entries: ProductEntry[],
  apiProducts: CreatorsProduct[],
): CreatorsProduct[] {
  const apiByAsin = new Map(apiProducts.map((p) => [p.asin, p]));

  return entries.map((entry) => {
    const fallback = buildFallbackProduct(entry);
    const api = apiByAsin.get(entry.asin);
    if (!api) {
      return {
        ...fallback,
        imageUrl: entry.imageUrl
          ? upgradeAmazonImageUrl(entry.imageUrl, 500)
          : fallback.imageUrl,
      };
    }

    return {
      ...fallback,
      ...api,
      title: api.title || fallback.title,
      price: entry.price ?? api.price ?? fallback.price,
      referencePrice: entry.referencePrice ?? fallback.referencePrice,
      savings: entry.savings ?? api.savings ?? fallback.savings,
      imageUrl: api.imageUrl
        ? upgradeAmazonImageUrl(api.imageUrl, 500)
        : entry.imageUrl ?? fallback.imageUrl,
      detailPageUrl: affiliateUrl(api.detailPageUrl),
    };
  });
}
