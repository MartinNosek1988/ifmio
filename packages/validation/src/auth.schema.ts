import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Neplatný email'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků'),
  tenantName: z.string().min(2).max(200),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
