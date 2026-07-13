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

function getFrontmatterProducts(file: {
  data?: Record<string, unknown>;
}): ProductEntry[] {
  const astro = file.data?.astro as
    | { frontmatter?: { products?: ProductEntry[] } }
    | undefined;
  return astro?.frontmatter?.products ?? [];
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
