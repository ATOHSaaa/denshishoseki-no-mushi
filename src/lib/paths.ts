/** サイト内リンク（GitHub Pages の base パスを含む） */
export function path(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
    return href;
  }
  const base = import.meta.env.BASE_URL;
  const normalized = href.startsWith('/') ? href.slice(1) : href;
  return `${base}${normalized}`;
}
