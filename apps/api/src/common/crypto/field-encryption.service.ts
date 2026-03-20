import { Injectable, Logger } from '@nestjs/common'
import { CryptoService } from '../crypto.service'

/**
 * Defines which fields on which models should be automatically encrypted.
 * Keys = Prisma model name (PascalCase), values = field names.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Party: ['bankAccount', 'iban', 'dataBoxId'],
  Resident: ['bankAccount', 'dataBoxId'],
}

const ENC_PREFIX = 'enc:'

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name)

  constructor(private crypto: CryptoService) {}

  /** Encrypt a single value. Returns prefixed ciphertext. */
  encryptField(value: string): string {
    if (!value || value.startsWith(ENC_PREFIX)) return value
    if (!this.crypto.isConfigured) return value
    return ENC_PREFIX + this.crypto.encrypt(value)
  }

  /** Decrypt a single value. Returns plaintext. */
  decryptField(value: string): string {
    if (!value || !value.startsWith(ENC_PREFIX)) return value
    if (!this.crypto.isConfigured) return value
    try {
      return this.crypto.decrypt(value.slice(ENC_PREFIX.length))
    } catch {
      this.logger.warn('Failed to decrypt field — returning as-is')
      return value
    }
  }

  /** Get the encryption map for a model. Returns empty array if no fields to encrypt. */
  getEncryptedFields(model: string): string[] {
    return ENCRYPTED_FIELDS[model] ?? []
  }

  /** Encrypt all sensitive fields in a data object (for create/update). */
  encryptData(model: string, data: Record<string, unknown>): Record<string, unknown> {
    const fields = this.getEncryptedFields(model)
    if (fields.length === 0) return data

    const result = { ...data }
    for (const field of fields) {
      if (typeof result[field] === 'string' && result[field]) {
        result[field] = this.encryptField(result[field] as string)
      }
    }
    return result
  }

  /** Decrypt all sensitive fields in a result object (for read). */
  decryptData(model: string, data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return data
    const fields = this.getEncryptedFields(model)
    if (fields.length === 0) return data

    const result = { ...data }
    for (const field of fields) {
      if (typeof result[field] === 'string' && result[field]) {
        result[field] = this.decryptField(result[field] as string)
      }
    }
    return result
  }
}
