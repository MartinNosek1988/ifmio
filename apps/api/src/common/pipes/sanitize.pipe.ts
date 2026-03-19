import { Injectable, PipeTransform } from '@nestjs/common'
import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape',
}

/**
 * Global pipe that strips HTML tags from all string inputs.
 * Prevents stored XSS by sanitizing at the API boundary.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, SANITIZE_OPTIONS)
    }
    if (Array.isArray(value)) {
      return value.map(item => this.transform(item))
    }
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value as Record<string, unknown>)
    }
    return value
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        result[key] = sanitizeHtml(val, SANITIZE_OPTIONS)
      } else if (Array.isArray(val)) {
        result[key] = val.map(item => this.transform(item))
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.sanitizeObject(val as Record<string, unknown>)
      } else {
        result[key] = val
      }
    }
    return result
  }
}
