import { statSync } from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { baseSlugFromEntryPath } from './post-slug';

export type Post = CollectionEntry<'posts'>;

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

export function getPostSortTime(post: Post): number {
  const pub = post.data.pubDate.valueOf();
  const updated = post.data.updatedDate?.valueOf();
  if (updated != null && updated > pub) return updated;
  return pub;
}

function getPostMtimeMs(post: Post): number {
  const candidates = [
    `${post.id}.md`,
    `${baseSlugFromEntryPath(post.id)}.md`,
  ];
  for (const name of candidates) {
    try {
      return statSync(path.join(POSTS_DIR, name)).mtimeMs;
    } catch {
      // 次の候補を試す
    }
  }
  return 0;
}

export function comparePostsNewestFirst(a: Post, b: Post): number {
  const byDate = getPostSortTime(b) - getPostSortTime(a);
  if (byDate !== 0) return byDate;
  return getPostMtimeMs(b) - getPostMtimeMs(a);
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort(comparePostsNewestFirst);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });
}

export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/** Asia/Tokyo の暦日（YYYY-MM-DD） */
export function toTokyoDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 公開日が本日（Asia/Tokyo）か */
export function isPublishedToday(
  pubDate: Date,
  now: Date = new Date(),
): boolean {
  return toTokyoDateKey(pubDate) === toTokyoDateKey(now);
}

export function getPostsByCategory(
  posts: Post[],
  category: Post['data']['category'],
  limit?: number,
): Post[] {
  const filtered = posts.filter((post) => post.data.category === category);
  return limit != null ? filtered.slice(0, limit) : filtered;
}

export function getRelatedPosts(
  current: Post,
  allPosts: Post[],
  limit = 4,
): Post[] {
  const others = allPosts.filter((p) => p.id !== current.id);

  const scored = others.map((post) => {
    let score = 0;
    if (post.data.category === current.data.category) score += 3;
    if (
      current.data.saleEvent &&
      post.data.saleEvent === current.data.saleEvent
    ) {
      score += 5;
    }
    for (const t of current.data.tags) {
      if (post.data.tags.includes(t)) score += 2;
    }
    return { post, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || comparePostsNewestFirst(a.post, b.post),
    )
    .slice(0, limit)
    .map((s) => s.post);
}
