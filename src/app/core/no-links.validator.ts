import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Patterns that mean "there is a link in here".
 *
 * The order is deliberate: cheap literal checks first, the domain sweep last,
 * since it is the only one that has to scan for a word boundary.
 */
const LINK_PATTERNS: readonly RegExp[] = [
  // Any scheme, written normally or mangled to dodge a filter: hxxp, h**p, h t t p.
  /\b(?:h\W*[tx*]\W*[tx*]\W*p\W*s?|ftp|sftp|mailto|tel|data|file|javascript|vbscript)\s*:/i,
  // Scheme-relative links, which browsers and mail clients still follow.
  /(?:^|\s)\/\//,
  /\bwww\s*[.,]\s*\w/i,
  // Markdown and BBCode link syntax.
  /\[[^\]]*\]\s*\(/,
  /\[\s*(?:url|link|a\b)[^\]]*\]/i,
  /<\s*a\b[^>]*href/i,
  // "example (dot) com", "example[.]com" — the standard way of writing a domain
  // past a filter that only looks for a full stop.
  /\w\s*[([{<]\s*(?:dot|punto|punkt)\s*[)\]}>]\s*\w/i,
  DOMAIN(),
];

/**
 * A bare domain such as `bit.ly` or `example.com`, matched against a fixed list
 * of endings rather than "any two letters after a dot".
 *
 * The generic version flags ordinary prose — a homeowner writing "shingles are
 * cracked.The gutter leaks" would be told their description contains a link and
 * would have no idea why. Every false positive here is a lost enquiry, so the
 * list stays explicit: the common endings, plus the ones link spam actually
 * arrives on.
 */
function DOMAIN(): RegExp {
  const tlds = [
    // Generic
    'com', 'net', 'org', 'info', 'biz', 'edu', 'gov', 'int', 'mil',
    // Tech and startup
    'io', 'co', 'ai', 'app', 'dev', 'me', 'tv', 'cc', 'ly', 'gl', 'sh', 'to', 'gg',
    // Heavily abused by spam
    'xyz', 'top', 'online', 'site', 'shop', 'club', 'link', 'live', 'click',
    'buzz', 'icu', 'work', 'space', 'website', 'store', 'fun', 'life', 'world',
    'vip', 'cyou', 'rest', 'quest', 'monster', 'sbs', 'cfd', 'bond',
    // Country codes seen most often
    'us', 'uk', 'ca', 'au', 'nz', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at',
    'se', 'no', 'dk', 'fi', 'pl', 'cz', 'pt', 'gr', 'ie', 'ru', 'ua', 'tr', 'il',
    'in', 'pk', 'bd', 'lk', 'cn', 'jp', 'kr', 'tw', 'hk', 'sg', 'my', 'th', 'vn',
    'ph', 'id', 'br', 'mx', 'ar', 'cl', 'pe', 'za', 'ng', 'ke', 'eg', 'ae', 'sa',
  ];
  // A label, a dot (optionally padded or bracketed), then a known ending that is
  // not itself followed by more letters.
  return new RegExp(`\\b[a-z0-9][a-z0-9-]*\\s*[.\\[(]?\\s*\\.?\\s*[)\\]]?\\s*\\.\\s*(?:${tlds.join('|')})\\b(?![a-z])`, 'i');
}

/**
 * Rejects any value containing something a reader could follow as a link.
 *
 * The client asked that no links come through this form at all. Worth being
 * clear about the reach: this stops link spam typed into the form, and the
 * scripted bots that drive a real browser. It cannot stop a bot that POSTs to
 * the FormSubmit endpoint directly, because that endpoint is public by design
 * and no client-side rule is in its path. The honeypot field and FormSubmit's
 * own `_blacklist` are the parts that run on their side.
 */
export function noLinks(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || !value.trim()) return null;

  // Percent-encoding hides `://` from every pattern above, so undo it first.
  // A malformed sequence is not decodable and is left as-is.
  let text = value;
  try {
    text = decodeURIComponent(value);
  } catch {
    /* keep the raw value */
  }

  return LINK_PATTERNS.some((pattern) => pattern.test(text)) ? { link: true } : null;
}
