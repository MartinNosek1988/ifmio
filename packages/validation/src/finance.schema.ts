import { z } from 'zod';

export const VatRateValues = [0, 12, 21] as const;
export const TransactionTypeValues = ['income', 'expense', 'transfer'] as const;

export const CreateTransactionSchema = z.object({
  type: z.enum(TransactionTypeValues),
  amount: z.number().positive('Částka musí být kladná'),
  vatRate: z.union([z.literal(0), z.literal(12), z.literal(21)]),
  description: z.string().min(1).max(500),
  date: z.string().datetime(),
  propertyId: z.string().uuid().optional(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial();

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
