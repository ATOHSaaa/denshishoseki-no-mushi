/** 最初の h2 より前をリード、以降を本文として分割 */
export function splitArticleBody(body: string): { lead: string; body: string } {
  const trimmed = body.trim();
  if (!trimmed) return { lead: '', body: '' };

  const match = trimmed.match(/\n## /);
  if (!match || match.index === undefined) {
    return { lead: trimmed, body: '' };
  }

  return {
    lead: trimmed.slice(0, match.index).trim(),
    body: trimmed.slice(match.index + 1).trim(),
  };
}

/** リードをアソシエイト表記の前後に分割（`::after-affiliate::` で区切る） */
export function splitArticleLead(lead: string): {
  intro: string;
  afterAffiliate: string;
} {
  const marker = '::after-affiliate::';
  const index = lead.indexOf(marker);
  if (index === -1) {
    return { intro: lead.trim(), afterAffiliate: '' };
  }

  return {
    intro: lead.slice(0, index).trim(),
    afterAffiliate: lead.slice(index + marker.length).trim(),
  };
}
