import { z } from 'zod/v3'

export const residentSchema = z.object({
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

  note: z
    .string()
    .max(500, 'Poznamka je prilis dlouha')
    .optional()
    .or(z.literal('')),
})

export type ResidentFormValues = z.infer<typeof residentSchema>

export const residentDefaultValues: ResidentFormValues = {
  firstName:  '',
  lastName:   '',
  email:      '',
  phone:      '',
  role:       'tenant',
  propertyId: '',
  unitId:     '',
  note:       '',
}
