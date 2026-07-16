/**
 * Kindle日替わりセール記事を自動生成する
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

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TOKEN_URL = 'https://api.amazon.co.jp/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon/catalog/v1';
const MARKETPLACE = 'www.amazon.co.jp';
const DAILY_DEALS_URL =
  'https://www.amazon.co.jp/kindle-dbs/browse?metadata=storeType=ebooks&widgetId=ebooks-deals-storefront_KindleDailyDealsStrategy&title=Kindle%E6%97%A5%E6%9B%BF%E3%82%8F%E3%82%8A%E3%82%BB%E3%83%BC%E3%83%AB&sourceType=recs';
const MIN_ITEMS = 10;
const MAX_RETRIES = 3;
const DEAL_PAGE_URL =
  'https://www.amazon.co.jp/kindle-dbs/browse?metadata=storeType=ebooks&widgetId=ebooks-deals-storefront_KindleDailyDealsStrategy&title=Kindle%E6%97%A5%E6%9B%BF%E3%82%8F%E3%82%8A%E3%82%BB%E3%83%BC%E3%83%AB&sourceType=recs';

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
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    ymd: `${year}-${month}-${day}`,
    compact: `${year}${month}${day}`,
    slash: `${year}/${Number(month)}/${Number(day)}`,
    display: `${year}年${Number(month)}月${Number(day)}日`,
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

async function fetchItems(asins, token, partnerTag) {
  const items = [];
  for (let i = 0; i < asins.length; i += 10) {
    const chunk = asins.slice(i, i + 10);
    const res = await fetch(`${API_BASE}/getItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-marketplace': MARKETPLACE,
      },
      body: JSON.stringify({
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
      }),
    });
    if (!res.ok) throw new Error(`Creators API getItems error: ${res.status}`);
    const data = await res.json();
    items.push(...(data.itemsResult?.items ?? []));
    if (i + 10 < asins.length) await sleep(300);
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
        priceDisplay: Number.isFinite(yen) && yen < Number.POSITIVE_INFINITY ? formatYen(yen) : priceDisplay,
        yen,
        imageUrl,
      };
    })
    .filter((item) => item.priceDisplay && item.yen < Number.POSITIVE_INFINITY);
}

function pickFeatured(sorted) {
  return sorted.find((item) => item.yen <= 299) ?? sorted[0];
}

function yamlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildMarkdown({ date, featured, products }) {
  const count = products.length + 1;
  const featureShort = shortTitle(featured.title);
  const cheapest = [...products, featured].sort((a, b) => a.yen - b.yen)[0];
  const priceBands = [...new Set([featured, ...products].map((p) => p.yen))]
    .sort((a, b) => a - b)
    .filter((n) => n <= 499)
    .map(formatYen);

  const title = `Kindle日替わりセール（${date.slash}）｜${featureShort} ${featured.priceDisplay}ほか${count}冊`;
  const description = `${date.display}のKindle日替わりセール。『${featureShort}』が${featured.priceDisplay}。全${count}冊がセール中。`;

  const tagSeeds = [
    'Kindle',
    'セール',
    '日替わりセール',
    ...featureShort.split(/\s+/).slice(0, 2),
  ];
  const tags = [...new Set(tagSeeds.filter(Boolean))].slice(0, 8);

  const productLines = products
    .map(
      (p) => `  - asin: ${p.asin}
    label: ${labelFor(p.title)}
    price: ${p.priceDisplay}
    savings: 日替わりセール`,
    )
    .join('\n');

  return `---
title: ${yamlQuote(title)}
description: ${yamlQuote(description)}
pubDate: ${date.ymd}
updatedDate: ${date.ymd}
category: deals
tags: [${tags.join(', ')}]
saleEvent: kindle-daily-deal
saleEndDate: ${date.ymd}
thumbnailImage: /images/posts/kindle-daily-deals-${date.compact}-thumb.jpg
featuredProduct:
  asin: ${featured.asin}
  label: ${labelFor(featured.title)}
  price: ${featured.priceDisplay}
  savings: 日替わりセール
products:
${productLines}
---

${date.display}の[Kindle日替わりセール](${DEAL_PAGE_URL})では、マンガ・新書・実用書など**全${count}冊**がセール価格で購入できます。『${featureShort}』が${featured.priceDisplay}など、価格帯ごとに掘り出し物が並んでいます。

日替わりセールは**当日中に終了**するキャンペーンです。気になる本は早めに確認してみてください。

::after-affiliate::

今回のラインナップは、**${priceBands.join('・')}**の価格帯。気になっていた1冊をさがしてみてください！

## セール概要

| 項目 | 内容 |
|------|------|
| キャンペーン名 | Kindle日替わりセール |
| 対象日 | ${date.display} |
| 掲載冊数 | ${count}冊（執筆時点） |
| 最安価格帯 | ${cheapest.priceDisplay}（${shortTitle(cheapest.title)}） |
| 目玉 | ${featureShort}（${featured.priceDisplay}） |
| 確認先 | [Kindle日替わりセールページ](${DEAL_PAGE_URL}) |

価格や掲載タイトルはいつでも変わる可能性があるため、購入前にAmazon.co.jpの表示をご確認ください。
`;
}

async function downloadImage(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok || !res.body) throw new Error(`image download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function createThumbnail(featured, second, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  const tmpA = join(ROOT, `.tmp-cover-a-${featured.asin}.jpg`);
  const tmpB = second ? join(ROOT, `.tmp-cover-b-${second.asin}.jpg`) : null;

  try {
    await downloadImage(featured.imageUrl, tmpA);
    if (second) await downloadImage(second.imageUrl, tmpB);

    const sharp = (await import('sharp')).default;
    const coverHeight = 480;
    const gap = 28;
    const padX = 48;
    const padY = 40;
    const bg = { r: 244, g: 241, b: 236 };

    async function resized(path) {
      const img = sharp(path);
      const meta = await img.metadata();
      const w = meta.width ?? 300;
      const h = meta.height ?? 480;
      const newW = Math.round((w * coverHeight) / h);
      return img
        .resize(newW, coverHeight, { fit: 'contain', background: bg })
        .png()
        .toBuffer({ resolveWithObject: true });
    }

    const a = await resized(tmpA);
    if (!second || !tmpB) {
      await sharp({
        create: {
          width: padX * 2 + a.info.width,
          height: padY * 2 + coverHeight,
          channels: 3,
          background: bg,
        },
      })
        .composite([{ input: a.data, left: padX, top: padY }])
        .jpeg({ quality: 90 })
        .toFile(outPath);
      return;
    }

    const b = await resized(tmpB);
    const width = padX * 2 + a.info.width + gap + b.info.width;
    const height = padY * 2 + coverHeight;
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: bg,
      },
    })
      .composite([
        { input: a.data, left: padX, top: padY },
        { input: b.data, left: padX + a.info.width + gap, top: padY },
      ])
      .jpeg({ quality: 90 })
      .toFile(outPath);
  } finally {
    for (const p of [tmpA, tmpB]) {
      if (p && existsSync(p)) {
        try {
          await import('node:fs/promises').then((fs) => fs.unlink(p));
        } catch {
          // ignore
        }
      }
    }
  }
}

async function main() {
  loadEnvFile();
  const force = process.argv.includes('--force');
  const date = tokyoParts();

  const postPath = join(ROOT, 'src/content/posts', `kindle-daily-deals-${date.compact}.md`);
  const thumbPath = join(
    ROOT,
    'public/images/posts',
    `kindle-daily-deals-${date.compact}-thumb.jpg`,
  );

  if (existsSync(postPath) && !force) {
    console.log(`[daily-deals] already exists: ${postPath} (skip)`);
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

  mkdirSync(dirname(postPath), { recursive: true });
  writeFileSync(postPath, buildMarkdown({ date, featured, products }), 'utf8');
  console.log(`[daily-deals] wrote ${postPath}`);

  await createThumbnail(featured, products[0] ?? null, thumbPath);
  console.log(`[daily-deals] wrote ${thumbPath}`);
  console.log(
    `[daily-deals] done: ${products.length + 1} books, featured=${featured.asin} ${featured.priceDisplay}`,
  );
}

main().catch((err) => {
  console.error('[daily-deals] failed:', err);
  process.exit(1);
});
