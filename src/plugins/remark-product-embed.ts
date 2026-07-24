import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  findProductEntry,
  type ProductEntry,
} from '../lib/product-entry.ts';
import { renderProductEmbedHtml } from '../lib/product-embed-html.ts';

const MARKER_RE = /^::product(?:\{([A-Z0-9]{10})\})?::$/i;

function getParagraphText(node: {
  children?: { type: string; value?: string }[];
}): string | null {
  const children = node.children ?? [];
  if (children.length !== 1 || children[0]?.type !== 'text') return null;
  return children[0].value ?? null;
}

function getFrontmatterRecord(file: {
  data?: Record<string, unknown>;
}): Record<string, unknown> {
  const astro = file.data?.astro as
    | { frontmatter?: Record<string, unknown> }
    | undefined;
  const direct = file.data?.frontmatter as Record<string, unknown> | undefined;
  return astro?.frontmatter ?? direct ?? {};
}

function getFrontmatterProducts(file: {
  data?: Record<string, unknown>;
}): ProductEntry[] {
  const fm = getFrontmatterRecord(file);
  const products = (fm.products as ProductEntry[] | undefined) ?? [];
  const featured = fm.featuredProduct as ProductEntry | undefined;
  const groups =
    (fm.productGroups as { products?: ProductEntry[] }[] | undefined) ?? [];

  const all: ProductEntry[] = [
    ...(featured ? [featured] : []),
    ...products,
    ...groups.flatMap((group) => group.products ?? []),
  ];

  const seen = new Set<string>();
  return all.filter((entry) => {
    const key = entry.asin.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const remarkProductEmbed: Plugin<[], Root> = () => {
  return (tree, file) => {
    const products = getFrontmatterProducts(file);

    visit(tree, 'paragraph', (node, index, parent) => {
      if (index === undefined || !parent) return;

      const text = getParagraphText(node);
      if (!text) return;

      const match = MARKER_RE.exec(text.trim());
      if (!match) return;

      const entry = findProductEntry(products, match[1]);
      if (!entry) return;

      parent.children[index] = {
        type: 'html',
        value: renderProductEmbedHtml(entry),
      };
    });
  };
};
