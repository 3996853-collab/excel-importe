
import { z } from 'zod';

export const genericImportSchema = z.object({
  externalCode: z.string().min(1, '外部编码必填'),
  receiverName: z.string().min(1, '收件人姓名必填'),
  receiverPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式错误'),
  weight: z.coerce.number().positive('重量必须为正数'),
  quantity: z.coerce.number().int().positive('件数必须为正整数'),
  temperature: z.coerce.number().min(-30, '温层最低 -30').max(50, '温层最高 50'),
  address: z.string().min(5, '地址太短'),
});

export type GenericImportData = z.infer<typeof genericImportSchema>;
