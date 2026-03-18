import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

@Injectable()
export class CryptoService {
  private readonly key: Buffer

  constructor(private config: ConfigService) {
    const secret = this.config.get<string>('ENCRYPTION_KEY') ?? ''
    // Use key if provided; otherwise no-op mode (encrypt/decrypt pass through)
    this.key = secret.length >= 32 ? Buffer.from(secret.slice(0, 32)) : Buffer.alloc(0)
  }

  get isConfigured(): boolean {
    return this.key.length === 32
  }

  encrypt(plaintext: string): string {
    if (!this.isConfigured) return plaintext
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return ciphertext // legacy plaintext fallback
    if (!this.isConfigured) return ciphertext
    try {
      const [ivHex, tagHex, encHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const tag = Buffer.from(tagHex, 'hex')
      const encrypted = Buffer.from(encHex, 'hex')
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv)
      decipher.setAuthTag(tag)
      return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
    } catch {
      return ciphertext // fallback on decrypt failure
    }
  }
}
