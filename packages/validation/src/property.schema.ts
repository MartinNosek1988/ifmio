import { z } from 'zod';

export const PropertyTypeValues = [
  'SVJ',
  'BD',
  'RENTAL_RESIDENTIAL',
  'RENTAL_MUNICIPAL',
  'CONDO_NO_SVJ',
  'MIXED_USE',
  'SINGLE_FAMILY',
  'COMMERCIAL_OFFICE',
  'COMMERCIAL_RETAIL',
  'COMMERCIAL_WAREHOUSE',
  'COMMERCIAL_INDUSTRIAL',
  'PARKING',
  'LAND',
  'OTHER',
] as const;

export const OwnershipTypeValues = [
  'vlastnictvi',
  'druzstvo',
  'pronajem',
] as const;

export const CreatePropertySchema = z.object({
  name: z.string().min(1, 'Název je povinný').max(200),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{3}\s?\d{2}$/, 'Neplatné PSČ'),
  type: z.enum(PropertyTypeValues),
  ownership: z.enum(OwnershipTypeValues),
});

export const UpdatePropertySchema = CreatePropertySchema.partial();

export const CreateUnitSchema = z.object({
  name: z.string().min(1).max(100),
  floor: z.number().int().optional(),
  area: z.number().positive().optional(),
});

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
