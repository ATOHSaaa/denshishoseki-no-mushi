import { escapeProductCardHtml } from './product-card-price.ts';
import { withAmazonAssociateTag } from './associate-tag.ts';

const DEFAULT_LABEL = '一覧をAmazonで見る';
const DEFAULT_NODE_ID = '220210079051';

export function resolveAmazonCtaUrl(target?: string): string {
  const value = target?.trim();
  if (!value) {
    return `https://www.amazon.co.jp/b?node=${DEFAULT_NODE_ID}`;
  }
  if (/^\d+$/.test(value)) {
    return `https://www.amazon.co.jp/b?node=${value}`;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  if (value.startsWith('/')) {
    return `https://www.amazon.co.jp${value}`;
  }
  return `https://www.amazon.co.jp/b?node=${value}`;
}

export function renderAmazonCtaHtml(
  target?: string,
  label: string = DEFAULT_LABEL,
): string {
  const href = withAmazonAssociateTag(resolveAmazonCtaUrl(target));
  return `<p class="article-cta"><a class="article-cta__btn" href="${escapeProductCardHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeProductCardHtml(label)}</a></p>`;
}
