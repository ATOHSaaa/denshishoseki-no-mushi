import { affiliate } from '@/config/site';
import { withAmazonAssociateTag } from './associate-tag';

const AMAZON_BASE = 'https://www.amazon.co.jp';

export function affiliateUrl(url: string, tag?: string): string {
  return withAmazonAssociateTag(url, tag ?? affiliate.tag);
}

export function productUrl(asin: string, tag?: string): string {
  return affiliateUrl(`${AMAZON_BASE}/dp/${asin}`, tag);
}

export interface CreatorsProduct {
  asin: string;
  title: string;
  detailPageUrl: string;
  imageUrl?: string;
  price?: string;
  referencePrice?: string;
  savings?: string;
  isPrime?: boolean;
}
