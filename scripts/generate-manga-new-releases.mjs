/**
 * ブクログのマンガ新刊ピックアップ記事を自動生成する
 *
 * tadeku-agent の scrape_booklog.py（comic タブ）を流用して取得し、
 * Markdown 記事とサムネイルを出力する。
 *
 * Usage:
 *   node scripts/generate-manga-new-releases.mjs
 *   node scripts/generate-manga-new-releases.mjs --date 2026-07-20
 *   node scripts/generate-manga-new-releases.mjs --force
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TADEKU_AGENT = join(ROOT, '..', 'tadeku-agent');

function parseArgs(argv) {
  const args = { force: false, date: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--date') {
      args.date = argv[++i];
    }
  }
  return args;
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
    jpShort: `${Number(month)}月${Number(day)}日`,
  };
}

function yamlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function shortTitle(title) {
  return title
    .replace(/\s*\([^)]*ガルドコミックス[^)]*\)/, '')
    .replace(/\s*~\s*.+$/, '')
    .replace(/\s+\d+\s*$/, '')
    .trim();
}

function coverUrl(asin) {
  return `https://images-fe.ssl-images-amazon.com/images/P/${asin}.09._SL500_.jpg`;
}

function scrapeComicReleases(dateYmd) {
  const script = `
import json, sys
from datetime import date
from pathlib import Path
sys.path.insert(0, ${JSON.stringify(join(TADEKU_AGENT, 'scripts'))})
from scrape_booklog import parse_booklog, fetch_html
release_date = ${JSON.stringify(dateYmd)}
target = date.fromisoformat(release_date)
html = fetch_html(f'https://booklog.jp/release/comic/{release_date}?display=list')
items, skipped = parse_booklog(html, 'comic', target_date=target)
print(json.dumps({'date': release_date, 'items': items, 'skippedByDate': skipped}, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-c', script], {
    encoding: 'utf8',
    cwd: TADEKU_AGENT,
  });
  if (result.status !== 0) {
    throw new Error(`scrape failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout.trim());
}

function loadPicks(dateYmd) {
  const picksPath = join(ROOT, 'scripts/picks', `manga-new-releases-${dateYmd.replace(/-/g, '')}.json`);
  if (!existsSync(picksPath)) return null;
  return JSON.parse(readFileSync(picksPath, 'utf8'));
}

function resolvePicks(booklog, picksConfig) {
  const byAsin = new Map(booklog.items.map((item) => [item.asin, item]));
  const featuredAsin = picksConfig.featuredAsin || picksConfig.picks[0]?.asin;
  const picks = picksConfig.picks.map((pick) => {
    const item = byAsin.get(pick.asin);
    if (!item) throw new Error(`ASIN not found in booklog: ${pick.asin}`);
    return { ...item, note: pick.note || '' };
  });
  const featured = picks.find((p) => p.asin === featuredAsin) || picks[0];
  const others = picks.filter((p) => p.asin !== featured.asin);
  const pickAsins = new Set(picks.map((p) => p.asin));
  const remaining = booklog.items.filter((item) => !pickAsins.has(item.asin));
  return { featured, others, remaining, totalCount: booklog.items.length };
}

function buildMarkdown({ date, featured, others, remaining, totalCount }) {
  const featureShort = shortTitle(featured.title);
  const otherShort = others.slice(0, 2).map((p) => shortTitle(p.title));
  const title = `マンガ新刊ピックアップ（${date.slash}）｜${featureShort}ほか${others.length}冊`;
  const description = `${date.display}発売のマンガ新刊${totalCount}タイトルのうち、『${featureShort}』『${otherShort[0]}』ほか${others.length}冊をピックアップ。ガルドコミックス一斉発売日の注目作を紹介。`;

  const tags = [
    'マンガ',
    '新刊',
    'ガルドコミックス',
    shortTitle(featured.title).slice(0, 20),
    '2026年',
  ].filter(Boolean);

  const productYaml = (item, note) => `  - asin: ${yamlQuote(item.asin)}
    label: ${yamlQuote(item.title)}
    note: ${yamlQuote(note || item.note || '')}
    imageUrl: ${coverUrl(item.asin)}`;

  const pickSections = [featured, ...others]
    .map((item) => {
      const heading = shortTitle(item.title);
      const body = item.note
        ? `${item.note}。${item.author}作。`
        : `${item.author}作の新刊。`;
      return `### ${heading}

${body}

::product{${item.asin}}::`;
    })
    .join('\n\n');

  const otherSections = remaining
    .map((item) => `::product{${item.asin}}::`)
    .join('\n\n');

  const allProducts = [...others, ...remaining];

  return `---
title: ${yamlQuote(title)}
description: ${yamlQuote(description)}
pubDate: ${date.ymd}
updatedDate: ${date.ymd}
category: manga
tags: [${tags.join(', ')}]
thumbnailImage: /images/posts/manga-new-releases-${date.compact}-thumb.jpg
featuredProduct:
  asin: ${yamlQuote(featured.asin)}
  label: ${yamlQuote(featured.title)}
  note: ${yamlQuote(featured.note || '本日発売')}
  imageUrl: ${coverUrl(featured.asin)}
products:
${allProducts.map((item) => productYaml(item, item.note || `${item.author}作`)).join('\n')}
---

${date.display}は**ガルドコミックス（オーバーラップ）から${totalCount}タイトル**が一斉発売されています。いずれもWeb小説発の異世界・ファンタジー系が中心のラインナップです。

そのなかから、長く続いている人気シリーズの最新巻や、新連載の第1巻など**${others.length + 1}冊**をピックアップしました。

::after-affiliate::

## 今日のマンガ新刊ピックアップ

${pickSections}

## そのほかの新刊

今日発売のマンガには、上記以外にも次のようなタイトルがあります。

${otherSections}

単行本の発売日とKindle版の配信日は異なる場合があります。電子版を探す場合は、Amazonの商品ページでKindle版の有無もあわせて確認してみてください。
`;
}

async function downloadImage(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok || !res.body) throw new Error(`image download failed: ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function createThumbnail(featured, second, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  const tmpA = join(ROOT, `.tmp-cover-a-${featured.asin}.jpg`);
  const tmpB = second ? join(ROOT, `.tmp-cover-b-${second.asin}.jpg`) : null;

  try {
    await downloadImage(coverUrl(featured.asin), tmpA);
    if (second) await downloadImage(coverUrl(second.asin), tmpB);

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
      create: { width, height, channels: 3, background: bg },
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
  const args = parseArgs(process.argv);
  const date = args.date
    ? {
        ymd: args.date,
        compact: args.date.replace(/-/g, ''),
        slash: args.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) =>
          `${y}/${Number(m)}/${Number(d)}`,
        ),
        display: args.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) =>
          `${y}年${Number(m)}月${Number(d)}日`,
        ),
        jpShort: args.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, _y, m, d) =>
          `${Number(m)}月${Number(d)}日`,
        ),
      }
    : tokyoParts();

  const postPath = join(ROOT, 'src/content/posts', `manga-new-releases-${date.compact}.md`);
  const thumbPath = join(
    ROOT,
    'public/images/posts',
    `manga-new-releases-${date.compact}-thumb.jpg`,
  );

  if (existsSync(postPath) && !args.force) {
    console.log(`[manga-new-releases] already exists: ${postPath} (skip)`);
    return;
  }

  const picksConfig = loadPicks(date.ymd);
  if (!picksConfig) {
    throw new Error(
      `picks ファイルがありません: scripts/picks/manga-new-releases-${date.compact}.json`,
    );
  }

  console.log(`[manga-new-releases] scraping booklog comic tab for ${date.ymd}...`);
  const booklog = scrapeComicReleases(date.ymd);
  console.log(
    `[manga-new-releases] fetched ${booklog.items.length} titles (skipped: ${booklog.skippedByDate?.length ?? 0})`,
  );

  const { featured, others, remaining, totalCount } = resolvePicks(booklog, picksConfig);
  const markdown = buildMarkdown({ date, featured, others, remaining, totalCount });

  mkdirSync(dirname(postPath), { recursive: true });
  writeFileSync(postPath, markdown, 'utf8');
  console.log(`[manga-new-releases] wrote ${postPath}`);

  await createThumbnail(featured, others[0] ?? null, thumbPath);
  console.log(`[manga-new-releases] wrote ${thumbPath}`);
}

main().catch((err) => {
  console.error('[manga-new-releases] failed:', err);
  process.exit(1);
});
