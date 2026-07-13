import { categories, type CategoryId } from '@/config/site';

/** HTMLサイトマップ用の固定ページ一覧 */
export const staticSitemapPages = [
  { href: '/', label: 'トップ' },
  { href: '/posts/', label: '記事一覧' },
  { href: '/about/', label: 'About' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
  { href: '/contact/', label: 'お問い合わせ' },
  { href: '/sitemap/', label: 'サイトマップ' },
] as const;

export const categorySitemapPages = (
  Object.keys(categories) as CategoryId[]
).map((id) => ({
  href: `/category/${id}/`,
  label: categories[id].name,
}));
