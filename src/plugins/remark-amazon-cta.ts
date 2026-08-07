import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { renderAmazonCtaHtml } from '../lib/amazon-cta-html.ts';

const MARKER_RE = /^::amazon-cta(?:\{([^}]+)\})?::$/;

function getParagraphText(node: {
  children?: {
    type: string;
    value?: string;
    url?: string;
    children?: { value?: string }[];
  }[];
}): string | null {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  const parts: string[] = [];
  for (const child of children) {
    if (child.type === 'text') {
      parts.push(child.value ?? '');
      continue;
    }
    if (child.type === 'link') {
      parts.push(child.url ?? child.children?.[0]?.value ?? '');
      continue;
    }
    return null;
  }

  return parts.join('');
}

export const remarkAmazonCta: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (index === undefined || !parent) return;

      const text = getParagraphText(node);
      if (!text) return;

      const match = MARKER_RE.exec(text.trim());
      if (!match) return;

      parent.children[index] = {
        type: 'html',
        value: renderAmazonCtaHtml(match[1]),
      };
    });
  };
};
