export function formatPriceYen(price: string | undefined): string | undefined {
  if (!price) return undefined;
  const trimmed = price.trim();
  if (trimmed.endsWith('円')) return trimmed;
  const amount = trimmed.replace(/^[¥￥]\s*/, '');
  return `${amount}円`;
}
