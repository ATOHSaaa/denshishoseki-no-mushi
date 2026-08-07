import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function coverUrl(asin) {
  return `https://images-fe.ssl-images-amazon.com/images/P/${asin}.09._SL500_.jpg`;
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

export async function createMultiCoverThumbnail(asins, outPath, options = {}) {
  if (asins.length < 1) throw new Error('at least one ASIN required');

  const columns = options.columns ?? asins.length;
  const canvasWidth = options.canvasWidth ?? 800;
  const canvasHeight = options.canvasHeight ?? 500;
  const gap = options.gap ?? 16;
  const padX = options.padX ?? 40;
  const padY = options.padY ?? 40;
  const bg = options.background ?? { r: 244, g: 241, b: 236 };

  mkdirSync(dirname(outPath), { recursive: true });
  const tmpPaths = asins.map((asin, i) => join(ROOT, `.tmp-cover-${i}-${asin}.jpg`));

  try {
    await Promise.all(
      asins.map((asin, i) => downloadImage(coverUrl(asin), tmpPaths[i])),
    );

    const sharp = (await import('sharp')).default;
    const rows = Math.ceil(asins.length / columns);
    const innerWidth = canvasWidth - padX * 2;
    const innerHeight = canvasHeight - padY * 2;
    const maxRowCovers = Math.min(columns, asins.length);
    const coverHeight = Math.floor(
      (innerHeight - gap * Math.max(rows - 1, 0)) / rows,
    );
    const coverWidth = Math.floor(
      (innerWidth - gap * Math.max(maxRowCovers - 1, 0)) / maxRowCovers,
    );

    async function resized(path) {
      return sharp(path)
        .resize(coverWidth, coverHeight, { fit: 'contain', background: bg })
        .png()
        .toBuffer({ resolveWithObject: true });
    }

    const covers = await Promise.all(tmpPaths.map((p) => resized(p)));
    const composites = [];
    let top = padY + Math.round((innerHeight - rows * coverHeight - gap * (rows - 1)) / 2);

    for (let row = 0; row < rows; row += 1) {
      const rowCovers = covers.slice(row * columns, row * columns + columns);
      const rowWidth =
        rowCovers.length * coverWidth + gap * Math.max(rowCovers.length - 1, 0);
      let left = padX + Math.round((innerWidth - rowWidth) / 2);

      for (const cover of rowCovers) {
        const offsetX = Math.round((coverWidth - cover.info.width) / 2);
        const offsetY = Math.round((coverHeight - cover.info.height) / 2);
        composites.push({ input: cover.data, left: left + offsetX, top: top + offsetY });
        left += coverWidth + gap;
      }

      top += coverHeight + gap;
    }

    await sharp({
      create: { width: canvasWidth, height: canvasHeight, channels: 3, background: bg },
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(outPath);
  } finally {
    for (const p of tmpPaths) {
      if (existsSync(p)) {
        try {
          await import('node:fs/promises').then((fs) => fs.unlink(p));
        } catch {
          // ignore
        }
      }
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const [, , outPath, ...asins] = process.argv;
  if (!outPath || asins.length === 0) {
    console.error('Usage: node scripts/create-multi-cover-thumb.mjs <outPath> <asin...>');
    process.exit(1);
  }
  await createMultiCoverThumbnail(asins, outPath);
  console.log(`wrote ${outPath}`);
}
