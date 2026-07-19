import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { MarkdownHeading, MarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkAmazonCta } from '@/plugins/remark-amazon-cta';
import { remarkProductEmbed } from '@/plugins/remark-product-embed';
import { remarkExternalLinks } from '@/plugins/remark-external-links';

let processor: MarkdownProcessor | null = null;

/** CommonMark では ** の直後が「」『』だと強調にならないため、括弧の内側に寄せる */
function normalizeJaEmphasis(content: string): string {
  return content
    .replace(/\*\*「([^」\n]+)」\*\*/g, '「**$1**」')
    .replace(/\*\*『([^』\n]+)』\*\*/g, '『**$1**』');
}

async function getProcessor(): Promise<MarkdownProcessor> {
  processor ??= await createMarkdownProcessor({
    shikiConfig: { theme: 'github-light' },
    remarkPlugins: [remarkProductEmbed, remarkAmazonCta, remarkExternalLinks],
  });
  return processor;
}

export async function renderMarkdown(
  content: string,
  frontmatter: Record<string, unknown> = {},
): Promise<{ html: string; headings: MarkdownHeading[] }> {
  if (!content.trim()) {
    return { html: '', headings: [] };
  }

  const md = await getProcessor();
  const result = await md.render(normalizeJaEmphasis(content), { frontmatter });
  return {
    html: result.code,
    headings: result.metadata.headings,
  };
}
