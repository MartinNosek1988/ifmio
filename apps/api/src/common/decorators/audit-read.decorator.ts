import { SetMetadata } from '@nestjs/common'

export const AUDIT_READ_KEY = 'audit:read'
export const AuditRead = (entity: string) => SetMetadata(AUDIT_READ_KEY, entity)
