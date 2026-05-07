
import { z } from 'zod';

export const genericImportSchema = z.object({
  externalCode: z.string().min(1, 'External code is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{11}$/, 'Phone must be 11 digits').optional().or(z.literal('')),
});

export type GenericImportData = z.infer<typeof genericImportSchema>;
