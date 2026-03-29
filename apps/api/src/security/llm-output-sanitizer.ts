/**
 * Server-side LLM output sanitizer.
 *
 * Defense-in-depth: strip dangerous HTML/script content from LLM responses
 * before they reach any client. The frontend renders as plain text (React
 * auto-escapes), but this layer protects against:
 * - Future markdown/HTML rendering additions
 * - Non-web clients (WhatsApp, email) that may interpret HTML
 * - LLM prompt injection that produces executable content
 */

// HTML tags that could execute code or load external resources
const DANGEROUS_TAG_RE = /<\s*\/?\s*(script|iframe|object|embed|applet|form|input|textarea|button|select|link|meta|base|svg|math)\b[^>]*>/gi;

// Event handlers (onerror, onclick, onload, etc.)
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=\s*["'][^"']*["']/gi;

// javascript: / data: / vbscript: URLs
const DANGEROUS_URL_RE = /(?:javascript|vbscript|data)\s*:/gi;

// HTML entities that decode to dangerous content
const ENCODED_SCRIPT_RE = /&#(?:x6a|106);?\s*&#(?:x61|97);?\s*&#(?:x76|118);?\s*&#(?:x61|97);?\s*&#(?:x73|115);?\s*&#(?:x63|99);?\s*&#(?:x72|114);?\s*&#(?:x69|105);?\s*&#(?:x70|112);?\s*&#(?:x74|116);?\s*:/gi;

// Style expressions that can execute code (IE-specific but defense-in-depth)
const STYLE_EXPRESSION_RE = /expression\s*\(/gi;

// Generic HTML tags (for stripping all HTML)
const ALL_TAG_RE = /<\/?[a-z][a-z0-9]*\b[^>]*>/gi;

export interface SanitizeResult {
  output: string;
  stripped: number;
}

/**
 * Sanitize LLM output — remove dangerous HTML constructs.
 * Preserves markdown formatting (**, *, `, #, -, etc.).
 */
export function sanitizeLlmOutput(input: string): SanitizeResult {
  let output = input;
  let stripped = 0;

  // Count and remove dangerous patterns
  const countAndReplace = (re: RegExp, replacement = '') => {
    const matches = output.match(re);
    if (matches) {
      stripped += matches.length;
      output = output.replace(re, replacement);
    }
  };

  // Order: specific dangerous patterns first, then generic tags
  countAndReplace(ENCODED_SCRIPT_RE);
  countAndReplace(EVENT_HANDLER_RE);
  countAndReplace(DANGEROUS_URL_RE);
  countAndReplace(STYLE_EXPRESSION_RE);
  countAndReplace(DANGEROUS_TAG_RE);

  // Strip remaining HTML tags (keep text content)
  countAndReplace(ALL_TAG_RE);

  return { output: output.trim(), stripped };
}

/**
 * Quick check: does the string contain potentially dangerous content?
 * Useful for logging/metrics without modifying the string.
 */
export function containsDangerousContent(input: string): boolean {
  return (
    DANGEROUS_TAG_RE.test(input) ||
    EVENT_HANDLER_RE.test(input) ||
    DANGEROUS_URL_RE.test(input) ||
    ENCODED_SCRIPT_RE.test(input)
  );
}
