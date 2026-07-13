import type { ProductEntry } from './product-entry.ts';
import {
  escapeProductCardHtml,
  renderProductCardPriceHtml,
  resolveProductCardPrices,
} from './product-card-price.ts';
import { withAmazonAssociateTag } from './associate-tag.ts';

const AMAZON_IMAGE_BASE =
  'https://images-fe.ssl-images-amazon.com/images/P';

function productUrl(asin: string): string {
  return withAmazonAssociateTag(`https://www.amazon.co.jp/dp/${asin}`);
}

function amazonProductImageUrl(asin: string): string {
  return `${AMAZON_IMAGE_BASE}/${asin}.09._SL500_.jpg`;
}

export function renderProductEmbedHtml(entry: ProductEntry): string {
  const title = entry.label ?? entry.asin;
  const href = productUrl(entry.asin);
  const imageUrl = entry.imageUrl ?? amazonProductImageUrl(entry.asin);
  const label = entry.label
    ? `<p class="amazon-product-card__label">${escapeProductCardHtml(entry.label)}</p>`
    : '';
  const badges = entry.savings
    ? `<div class="amazon-product-card__badges"><span class="sale-badge sale-badge--sale">${escapeProductCardHtml(entry.savings)}</span></div>`
    : '';
  const price = renderProductCardPriceHtml(resolveProductCardPrices(entry));
  const note = entry.note
    ? `<p class="amazon-product-card__note">${escapeProductCardHtml(entry.note)}</p>`
    : '';

  return `<aside class="amazon-product-embed" aria-label="Amazon購入リンク">
<article class="amazon-product-card">
<a class="amazon-product-card__link" href="${escapeProductCardHtml(href)}" rel="nofollow sponsored noopener noreferrer" target="_blank">
<div class="amazon-product-card__image-wrap"><img src="${escapeProductCardHtml(imageUrl)}" alt="" width="160" height="160" loading="lazy" decoding="async" /></div>
<div class="amazon-product-card__body">
${badges}
${label}
<h3 class="amazon-product-card__title">${escapeProductCardHtml(title)}</h3>
${price}
${note}
<p class="amazon-product-card__cta">Amazon.co.jpで見る</p>
</div>
</a>
</article>
</aside>`;
}
