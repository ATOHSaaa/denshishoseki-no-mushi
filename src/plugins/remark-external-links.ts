import type { Link, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function withExternalLinkProps(node: Link): void {
  node.data ??= {};
  const props = { ...(node.data.hProperties as Record<string, string> | undefined) };

  props.target = '_blank';

  const rel = new Set(
    String(props.rel ?? '')
      .split(/\s+/)
      .filter(Boolean),
  );
  rel.add('noopener');
  rel.add('noreferrer');
  props.rel = [...rel].join(' ');

  node.data.hProperties = props;
}

export const remarkExternalLinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'link', (node) => {
      if (isExternalUrl(node.url)) {
        withExternalLinkProps(node);
      }
    });
  };
};
