import { SetMetadata, applyDecorators } from '@nestjs/common';

export const AuditAction = (entity: string, action: string) =>
  applyDecorators(
    SetMetadata('audit:entity', entity),
    SetMetadata('audit:action', action),
  );
