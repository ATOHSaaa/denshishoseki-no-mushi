import dailyDealsJson from '@/data/daily-deals.json';
import type { ProductEntry } from './product-entry';
import { toTokyoDateKey } from './posts';

export interface DailyDealsData {
  date: string;
  updatedAt: string;
  featuredProduct: ProductEntry;
  products: ProductEntry[];
}

export const KINDLE_DAILY_DEALS_URL =
  'https://www.amazon.co.jp/kindle-dbs/browse?metadata=storeType=ebooks&widgetId=ebooks-deals-storefront_KindleDailyDealsStrategy&title=Kindle%E6%97%A5%E6%9B%BF%E3%82%8F%E3%82%8A%E3%82%BB%E3%83%BC%E3%83%AB&sourceType=recs';

export function loadDailyDeals(): DailyDealsData | null {
  const data = dailyDealsJson as Partial<DailyDealsData>;
  if (!data.date || !data.featuredProduct?.asin) return null;
  return {
    date: data.date,
    updatedAt: data.updatedAt ?? data.date,
    featuredProduct: data.featuredProduct,
    products: data.products ?? [],
  };
}

/** 本日分（Asia/Tokyo）の Daily Deals。日付が一致しない場合は undefined */
export function getActiveDailyDeals(
  now: Date = new Date(),
): DailyDealsData | undefined {
  const data = loadDailyDeals();
  if (!data) return undefined;
  const today = toTokyoDateKey(now);
  if (data.date !== today) return undefined;
  return data;
}

export function getDailyDealEntries(data: DailyDealsData): ProductEntry[] {
  return [data.featuredProduct, ...data.products].map((entry) => ({
    asin: entry.asin,
    label: entry.label,
    price: entry.price,
    savings: entry.savings,
    imageUrl: entry.imageUrl,
    note: entry.note,
  }));
}

export function formatDailyDealsDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
}
