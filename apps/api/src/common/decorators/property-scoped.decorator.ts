import { SetMetadata } from '@nestjs/common'

export const PROPERTY_SCOPED_KEY = 'property:scoped'
export const PropertyScoped = () => SetMetadata(PROPERTY_SCOPED_KEY, true)
