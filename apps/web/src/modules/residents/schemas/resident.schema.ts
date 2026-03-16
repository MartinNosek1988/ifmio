// TODO: Switch back to 'zod' once @hookform/resolvers fixes Zod 4 classic compat
import { z } from 'zod/v3'

export const residentSchema = z.object({
  isLegalEntity: z.boolean(),

  firstName: z
    .string()
    .min(1, 'Jmeno je povinne')
    .max(50, 'Jmeno je prilis dlouhe'),

  lastName: z
    .string()
    .min(1, 'Prijmeni je povinne')
    .max(50, 'Prijmeni je prilis dlouhe'),

  email: z
    .string()
    .email('Neplatny email')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^(\+\d{1,3}\s?)?\d{7,15}$/, 'Neplatne telefonni cislo')
    .optional()
    .or(z.literal('')),

  role: z.enum(['owner', 'tenant', 'member', 'contact'], {
    required_error: 'Vyberte roli',
  }),

  propertyId: z
    .string()
    .uuid('Vyberte nemovitost')
    .optional()
    .or(z.literal('')),

  unitId: z
    .string()
    .uuid('Vyberte jednotku')
    .optional()
    .or(z.literal('')),

  ico: z.string().max(8, 'Max 8 cislic').optional().or(z.literal('')),
  dic: z.string().max(12, 'Max 12 znaku').optional().or(z.literal('')),
  companyName: z.string().max(200).optional().or(z.literal('')),
  correspondenceAddress: z.string().max(500).optional().or(z.literal('')),
  correspondenceCity: z.string().max(100).optional().or(z.literal('')),
  correspondencePostalCode: z.string().max(10).optional().or(z.literal('')),
  dataBoxId: z.string().max(50).optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  note: z.string().max(500, 'Poznamka je prilis dlouha').optional().or(z.literal('')),
})

export type ResidentFormValues = z.infer<typeof residentSchema>

export const residentDefaultValues: ResidentFormValues = {
  isLegalEntity: false,
  firstName:  '',
  lastName:   '',
  email:      '',
  phone:      '',
  role:       'tenant',
  propertyId: '',
  unitId:     '',
  ico:        '',
  dic:        '',
  companyName: '',
  correspondenceAddress: '',
  correspondenceCity: '',
  correspondencePostalCode: '',
  dataBoxId:  '',
  birthDate:  '',
  note:       '',
}
