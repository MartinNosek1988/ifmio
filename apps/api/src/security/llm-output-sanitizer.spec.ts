import { sanitizeLlmOutput, containsDangerousContent } from './llm-output-sanitizer';

describe('LLM Output Sanitizer', () => {
  describe('sanitizeLlmOutput', () => {
    // ── XSS payloads ───────────────────────────────────────────
    it('strips <script> tags', () => {
      const { output, stripped } = sanitizeLlmOutput('Hello <script>alert("xss")</script> world');
      expect(output).toBe('Hello alert("xss") world');
      expect(output).not.toContain('<script');
      expect(stripped).toBeGreaterThan(0);
    });

    it('strips <img onerror> payloads', () => {
      const { output } = sanitizeLlmOutput('<img src=x onerror="alert(1)">');
      expect(output).not.toContain('<img');
      expect(output).not.toContain('onerror');
    });

    it('strips javascript: URLs', () => {
      const { output } = sanitizeLlmOutput('Click [here](javascript:alert(1))');
      expect(output).not.toMatch(/javascript\s*:/i);
    });

    it('strips <iframe> tags', () => {
      const { output } = sanitizeLlmOutput('<iframe src="https://evil.com"></iframe>');
      expect(output).not.toContain('<iframe');
    });

    it('strips <svg onload> payloads', () => {
      const { output } = sanitizeLlmOutput('<svg onload="alert(1)"><circle r="10"/></svg>');
      expect(output).not.toContain('<svg');
      expect(output).not.toContain('onload');
    });

    it('strips <object> and <embed> tags', () => {
      const { output } = sanitizeLlmOutput('<object data="evil.swf"></object><embed src="evil.swf">');
      expect(output).not.toContain('<object');
      expect(output).not.toContain('<embed');
    });

    it('strips <form> and <input> tags', () => {
      const { output } = sanitizeLlmOutput('<form action="evil"><input type="text"><button>Submit</button></form>');
      expect(output).not.toContain('<form');
      expect(output).not.toContain('<input');
      expect(output).not.toContain('<button');
    });

    it('strips data: URLs', () => {
      const { output } = sanitizeLlmOutput('<a href="data:text/html,<script>alert(1)</script>">click</a>');
      expect(output).not.toMatch(/data\s*:/i);
    });

    it('strips vbscript: URLs', () => {
      const { output } = sanitizeLlmOutput('vbscript:MsgBox("xss")');
      expect(output).not.toMatch(/vbscript\s*:/i);
    });

    it('strips CSS expression()', () => {
      const { output } = sanitizeLlmOutput('style="width: expression(alert(1))"');
      expect(output).not.toContain('expression(');
    });

    it('strips HTML entity-encoded javascript:', () => {
      // &#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;: = javascript:
      const { output } = sanitizeLlmOutput('&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)');
      expect(output).not.toMatch(/javascript/i);
    });

    it('strips generic HTML tags (div, span, a, p, etc.)', () => {
      const { output } = sanitizeLlmOutput('<div class="evil"><a href="evil">link</a></div>');
      expect(output).not.toContain('<div');
      expect(output).not.toContain('<a ');
      expect(output).toContain('link');
    });

    // ── Safe content preservation ────────────────────────────────
    it('preserves plain text', () => {
      const text = 'Požadavek #123 byl vyřešen. Děkujeme za trpělivost.';
      const { output, stripped } = sanitizeLlmOutput(text);
      expect(output).toBe(text);
      expect(stripped).toBe(0);
    });

    it('preserves markdown formatting', () => {
      const md = '**Stav:** Vyřešeno\n\n- Položka 1\n- Položka 2\n\n`kód`\n\n# Nadpis';
      const { output } = sanitizeLlmOutput(md);
      expect(output).toBe(md);
    });

    it('preserves code blocks with angle brackets in backticks', () => {
      // LLM might reference HTML in code context — angle brackets in backtick code
      // Note: actual HTML tags get stripped even in code blocks (defense-in-depth)
      const text = 'Use `console.log("hello")` for debugging';
      const { output } = sanitizeLlmOutput(text);
      expect(output).toBe(text);
    });

    it('preserves comparison operators', () => {
      const text = 'If value > 10 and count < 100, use option A.';
      const { output } = sanitizeLlmOutput(text);
      expect(output).toBe(text);
    });

    it('preserves Czech text with diacritics', () => {
      const text = 'Žádost o vyúčtování — předpis záloh za období leden–únor 2026.';
      const { output } = sanitizeLlmOutput(text);
      expect(output).toBe(text);
    });

    it('preserves emoji', () => {
      const text = '✅ Požadavek vyřešen\n❌ Nepodařilo se';
      const { output } = sanitizeLlmOutput(text);
      expect(output).toBe(text);
    });

    // ── Edge cases ──────────────────────────────────────────────
    it('handles empty string', () => {
      const { output, stripped } = sanitizeLlmOutput('');
      expect(output).toBe('');
      expect(stripped).toBe(0);
    });

    it('handles nested dangerous content', () => {
      const { output } = sanitizeLlmOutput('<script><script>alert(1)</script></script>');
      expect(output).not.toContain('<script');
      expect(output).toContain('alert(1)');
    });

    it('handles case-insensitive tags', () => {
      const { output } = sanitizeLlmOutput('<SCRIPT>alert(1)</SCRIPT>');
      expect(output).not.toContain('SCRIPT');
    });
  });

  describe('containsDangerousContent', () => {
    it('returns true for script tags', () => {
      expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true);
    });

    it('returns true for event handlers', () => {
      expect(containsDangerousContent('<img onerror="alert(1)">')).toBe(true);
    });

    it('returns false for safe content', () => {
      expect(containsDangerousContent('Požadavek #123 vyřešen')).toBe(false);
    });

    it('returns false for markdown', () => {
      expect(containsDangerousContent('**bold** and *italic* and `code`')).toBe(false);
    });
  });
});
