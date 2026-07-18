import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { MarkdownHeading, MarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkAmazonCta } from '@/plugins/remark-amazon-cta';
import { remarkProductEmbed } from '@/plugins/remark-product-embed';
import { remarkExternalLinks } from '@/plugins/remark-external-links';

let processor: MarkdownProcessor | null = null;

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
  const result = await md.render(content, { frontmatter });
  return {
    html: result.code,
    headings: result.metadata.headings,
  };
}
