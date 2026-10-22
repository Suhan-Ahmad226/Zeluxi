const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a']);
const VOID_TAGS = new Set(['br']);
const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|svg|math|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/**
 * Restrict CMS rich text to simple formatting tags and safe links.
 * All attributes are discarded except a validated href on links.
 */
export function sanitizeRichTextHtml(value: string): string {
  const input = String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(DANGEROUS_BLOCKS, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[^>]*\/?\s*>/gi, '');

  return input.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (raw, rawTag: string, attributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (VOID_TAGS.has(tag)) return '<br>';
    if (raw.startsWith('</')) return `</${tag}>`;
    if (tag !== 'a') return `<${tag}>`;

    const hrefMatch = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();
    const safeHref = /^(https?:\/\/|mailto:|tel:)[^\s<>]*$/i.test(href) && !/[\u0000-\u001f&"']/.test(href);
    return safeHref ? `<a href="${href.replace(/</g, '&lt;').replace(/>/g, '&gt;')}">` : '<a>';
  });
}
