import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'
import sanitizeHtml from 'sanitize-html'

// Resolve the actual function (handles both ESM default and CJS export)
const sanitize: typeof sanitizeHtml =
  typeof sanitizeHtml === 'function'
    ? sanitizeHtml
    : (sanitizeHtml as any).default ?? sanitizeHtml

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  // Do NOT encode HTML entities on input — React escapes on output automatically.
  // Without this, & becomes &amp; in the DB, causing double-encoding on display.
  parseStyleAttributes: false,
  textFilter: (text: string) => text,
}

// Keys whose values must pass through unsanitized (e.g. XML content for ISDOC import)
const RAW_KEYS = new Set(['xmlContent', 'isdocXml'])

/**
 * Global pipe that strips ALL HTML tags from string inputs.
 * Prevents stored XSS by sanitizing at the API boundary.
 * Runs BEFORE ValidationPipe — sanitizes raw input before validation.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, _metadata?: ArgumentMetadata): unknown {
    if (value === null || value === undefined) return value
    if (typeof value === 'string') return this.sanitizeString(value)
    if (Buffer.isBuffer(value)) return value
    if (Array.isArray(value)) return value.map(item => this.transform(item))
    if (typeof value === 'object') return this.sanitizeObject(value as Record<string, unknown>)
    return value
  }

  private sanitizeString(str: string): string {
    // sanitize-html strips tags but also HTML-encodes entities by default.
    // We decode them back — React handles output escaping, so storing
    // encoded entities in DB causes double-encoding (&amp;amp;).
    return sanitize(str, SANITIZE_OPTIONS)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      if (RAW_KEYS.has(key) && typeof val === 'string') {
        result[key] = val
      } else if (typeof val === 'string') {
        result[key] = this.sanitizeString(val)
      } else if (Array.isArray(val)) {
        result[key] = val.map(item => this.transform(item))
      } else if (Buffer.isBuffer(val)) {
        result[key] = val
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.sanitizeObject(val as Record<string, unknown>)
      } else {
        result[key] = val
      }
    }
    return result
  }
}
