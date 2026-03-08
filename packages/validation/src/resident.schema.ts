import { z } from 'zod';

export const ResidentRoleValues = ['owner', 'tenant', 'member', 'contact'] as const;

export const CreateResidentSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  role: z.enum(ResidentRoleValues),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export const UpdateResidentSchema = CreateResidentSchema.partial();

export type CreateResidentInput = z.infer<typeof CreateResidentSchema>;
export type UpdateResidentInput = z.infer<typeof UpdateResidentSchema>;
