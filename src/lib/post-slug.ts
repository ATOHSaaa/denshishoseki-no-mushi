/** 記事 slug の末尾に付ける日付（Asia/Tokyo・YYYYMMDD） */
export function formatPostDateSlug(pubDate: unknown): string {
  const date = pubDate instanceof Date ? pubDate : new Date(String(pubDate));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}${month}${day}`;
}

/** ファイル名からベース slug を取り出す（末尾の -YYYYMMDD は除去） */
export function baseSlugFromEntryPath(entry: string): string {
  const name = entry.replace(/\.md$/i, '');
  return name.replace(/-\d{8}$/, '');
}

/** glob loader 用: `{base}-{YYYYMMDD}` */
export function generatePostId(
  entry: string,
  data: Record<string, unknown>,
): string {
  const base = baseSlugFromEntryPath(entry);
  const dateSlug = formatPostDateSlug(data.pubDate);
  return `${base}-${dateSlug}`;
}
