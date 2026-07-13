import { formatPriceYen } from './format-price';

export interface ProductCardPriceDisplay {
  salePrice?: string;
  referencePrice?: string;
  showCompare: boolean;
}

export function resolveProductCardPrices(input: {
  price?: string;
  referencePrice?: string;
}): ProductCardPriceDisplay {
  const salePrice = formatPriceYen(input.price);
  const referencePrice = formatPriceYen(input.referencePrice);
  const showCompare = Boolean(
    salePrice && referencePrice && salePrice !== referencePrice,
  );
  return { salePrice, referencePrice, showCompare };
}

export function escapeProductCardHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderProductCardPriceHtml(
  prices: ProductCardPriceDisplay,
): string {
  if (prices.showCompare && prices.salePrice && prices.referencePrice) {
    return `<div class="amazon-product-card__prices"><span class="amazon-product-card__price-ref">${escapeProductCardHtml(prices.referencePrice)}</span><span class="amazon-product-card__price-sale">${escapeProductCardHtml(prices.salePrice)}</span></div>`;
  }
  if (prices.salePrice) {
    return `<p class="amazon-product-card__price">${escapeProductCardHtml(prices.salePrice)}</p>`;
  }
  return `<p class="amazon-product-card__price amazon-product-card__price--muted">価格は商品ページでご確認ください</p>`;
}
