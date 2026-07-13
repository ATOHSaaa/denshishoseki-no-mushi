export const DEFAULT_ASSOCIATE_TAG = 'densho-tadeku-22';

export function getAssociateTag(): string {
  return import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG ?? DEFAULT_ASSOCIATE_TAG;
}

export function withAmazonAssociateTag(url: string, tag?: string): string {
  const associateTag = tag ?? getAssociateTag();
  if (!associateTag) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('amazon.co.jp')) {
      return url;
    }
    parsed.searchParams.set('tag', associateTag);
    return parsed.toString();
  } catch {
    return url;
  }
}
