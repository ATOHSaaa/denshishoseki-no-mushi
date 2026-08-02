/**
 * Kindle日替わりセール（Daily Deals）データを更新する
 *
 * Usage:
 *   node scripts/generate-daily-deals.mjs
 *   node scripts/generate-daily-deals.mjs --force
 *
 * Env:
 *   AMAZON_CREDENTIAL_ID / AMAZON_CREATORS_API_ACCESS_KEY
 *   AMAZON_CREDENTIAL_SECRET / AMAZON_CREATORS_API_SECRET_KEY
 *   AMAZON_CREATORS_API_PARTNER_TAG / PUBLIC_AMAZON_ASSOCIATE_TAG
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TOKEN_URL = 'https://api.amazon.co.jp/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon/catalog/v1';
const MARKETPLACE = 'www.amazon.co.jp';
const DAILY_DEALS_URL =
  'https://www.amazon.co.jp/kindle-dbs/browse?metadata=storeType=ebooks&widgetId=ebooks-deals-storefront_KindleDailyDealsStrategy&title=Kindle%E6%97%A5%E6%9B%BF%E3%82%8F%E3%82%8A%E3%82%BB%E3%83%BC%E3%83%AB&sourceType=recs';
const MIN_ITEMS = 10;
const MAX_RETRIES = 3;
const DATA_PATH = join(ROOT, 'src/data/daily-deals.json');

function loadEnvFile() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function tokyoParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    ymd: `${year}-${month}-${day}`,
    updatedAt: `${year}-${month}-${day}T${get('hour')}:${get('minute')}:${get('second')}+09:00`,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseYen(displayAmount) {
  if (!displayAmount) return Number.POSITIVE_INFINITY;
  const n = Number(String(displayAmount).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function formatYen(n) {
  return `${n}円`;
}

function shortTitle(title) {
  return title
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/\s*———.*$/u, '')
    .replace(/\s*──.*$/u, '')
    .replace(/\s*―+.*$/u, '')
    .trim();
}

function labelFor(title) {
  const base = shortTitle(title);
  return base.endsWith('Kindle版') ? base : `${base} Kindle版`;
}

function extractAsins(html) {
  const seen = new Set();
  const asins = [];
  const re = /\b(B0[0-9A-Z]{8})\b/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const asin = m[1];
    if (seen.has(asin)) continue;
    seen.add(asin);
    asins.push(asin);
  }
  return asins;
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9',
  Accept: 'text/html,application/xhtml+xml',
};
const MAX_PAGES = 5;

async function fetchPageHtml(page) {
  const url = page <= 1 ? DAILY_DEALS_URL : `${DAILY_DEALS_URL}&page=${page}`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    console.warn(`[daily-deals] fetch status ${res.status} (page ${page})`);
    return null;
  }
  return res.text();
}

async function fetchDailyDealAsins() {
  let lastCount = 0;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const seen = new Set();
    const asins = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const html = await fetchPageHtml(page);
      if (!html) break;
      const pageAsins = extractAsins(html);
      let added = 0;
      for (const asin of pageAsins) {
        if (seen.has(asin)) continue;
        seen.add(asin);
        asins.push(asin);
        added += 1;
      }
      console.log(
        `[daily-deals] page ${page}: ${pageAsins.length} on page, +${added} new (total ${asins.length})`,
      );
      if (added === 0) break;
      if (page < MAX_PAGES) await sleep(400);
    }
    lastCount = asins.length;
    console.log(`[daily-deals] scraped ${asins.length} ASINs (attempt ${attempt})`);
    if (asins.length >= MIN_ITEMS) return asins;
    if (attempt < MAX_RETRIES) await sleep(5000 * attempt);
  }
  throw new Error(
    `日替わりセールの ASIN が不足しています（取得 ${lastCount} 件、最低 ${MIN_ITEMS} 件）`,
  );
}

async function getAccessToken(clientId, clientSecret) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default',
    }),
  });
  if (!res.ok) throw new Error(`Creators API token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchItemsChunk(chunk, token, partnerTag) {
  const body = JSON.stringify({
    partnerTag,
    partnerType: 'Associates',
    marketplace: MARKETPLACE,
    itemIds: chunk,
    itemIdType: 'ASIN',
    resources: [
      'itemInfo.title',
      'images.primary.large',
      'images.primary.medium',
      'offersV2.listings.price',
    ],
  });
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${API_BASE}/getItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-marketplace': MARKETPLACE,
      },
      body,
    });
    if ((res.status === 429 || res.status === 504) && attempt < maxAttempts) {
      const wait = 2000 * attempt;
      console.warn(
        `[daily-deals] getItems ${res.status} (${chunk.length} ASINs), retry ${attempt}/${maxAttempts - 1} in ${wait}ms`,
      );
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`Creators API getItems error: ${res.status}`);
    return res.json();
  }
  throw new Error('Creators API getItems error: 429');
}

async function fetchItems(asins, token, partnerTag) {
  const items = [];
  for (let i = 0; i < asins.length; i += 10) {
    const chunk = asins.slice(i, i + 10);
    const data = await fetchItemsChunk(chunk, token, partnerTag);
    items.push(...(data.itemsResult?.items ?? []));
    if (i + 10 < asins.length) await sleep(800);
  }

  const byAsin = new Map(items.map((item) => [item.asin, item]));
  return asins
    .map((asin) => byAsin.get(asin))
    .filter(Boolean)
    .map((item) => {
      const title = item.itemInfo?.title?.displayValue ?? item.asin;
      const priceDisplay = item.offersV2?.listings?.[0]?.price?.money?.displayAmount;
      const yen = parseYen(priceDisplay);
      const imageUrl =
        item.images?.primary?.large?.url ??
        item.images?.primary?.medium?.url ??
        `https://images-fe.ssl-images-amazon.com/images/P/${item.asin}.09._SL500_.jpg`;
      return {
        asin: item.asin,
        title,
        priceDisplay:
          Number.isFinite(yen) && yen < Number.POSITIVE_INFINITY
            ? formatYen(yen)
            : priceDisplay,
        yen,
        imageUrl,
      };
    })
    .filter((item) => item.priceDisplay && item.yen < Number.POSITIVE_INFINITY);
}

function pickFeatured(sorted) {
  return sorted.find((item) => item.yen <= 299) ?? sorted[0];
}

function toProductEntry(item) {
  return {
    asin: item.asin,
    label: labelFor(item.title),
    price: item.priceDisplay,
    savings: '日替わりセール',
    imageUrl: item.imageUrl,
  };
}

function buildDailyDealsData({ date, featured, products }) {
  return {
    date: date.ymd,
    updatedAt: date.updatedAt,
    featuredProduct: toProductEntry(featured),
    products: products.map(toProductEntry),
  };
}

function readExistingDate() {
  if (!existsSync(DATA_PATH)) return null;
  try {
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    return data.date ?? null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile();
  const force = process.argv.includes('--force');
  const date = tokyoParts();

  const existingDate = readExistingDate();
  if (existingDate === date.ymd && !force) {
    console.log(`[daily-deals] already up to date: ${date.ymd} (skip)`);
    return;
  }

  const clientId =
    process.env.AMAZON_CREATORS_API_ACCESS_KEY ?? process.env.AMAZON_CREDENTIAL_ID;
  const clientSecret =
    process.env.AMAZON_CREATORS_API_SECRET_KEY ?? process.env.AMAZON_CREDENTIAL_SECRET;
  const partnerTag =
    process.env.AMAZON_CREATORS_API_PARTNER_TAG ?? process.env.PUBLIC_AMAZON_ASSOCIATE_TAG;

  if (!clientId || !clientSecret || !partnerTag) {
    throw new Error('Creators API の認証情報（ID/SECRET/PARTNER_TAG）が未設定です');
  }

  const asins = await fetchDailyDealAsins();
  const token = await getAccessToken(clientId, clientSecret);
  const items = await fetchItems(asins, token, partnerTag);
  if (items.length < MIN_ITEMS) {
    throw new Error(`商品解決後の件数が不足しています（${items.length} 件）`);
  }

  const sorted = [...items].sort((a, b) => a.yen - b.yen || a.title.localeCompare(b.title, 'ja'));
  const featured = pickFeatured(sorted);
  const products = sorted.filter((item) => item.asin !== featured.asin);
  const payload = buildDailyDealsData({ date, featured, products });

  writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[daily-deals] wrote ${DATA_PATH}`);
  console.log(
    `[daily-deals] done: ${products.length + 1} books, featured=${featured.asin} ${featured.priceDisplay}`,
  );
}

main().catch((err) => {
  console.error('[daily-deals] failed:', err);
  process.exit(1);
});
