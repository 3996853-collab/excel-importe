
import { z } from 'zod';

// Phone regex: Chinese mobile 11-digit starting with 1[3-9]
const phoneRegex = /^1[3-9]\d{9}$/;

export const TEMPERATURE_OPTIONS = ['常温', '冷藏', '冷冻'] as const;

export const genericImportSchema = z.object({
  // 外部标识
  externalCode: z.string().min(1, '外部编码不能为空'),

  // 收件人信息
  receiverName: z.string().min(1, '收件人姓名不能为空'),
  receiverPhone: z.string().regex(phoneRegex, '收件人手机号格式错误（需11位）'),
  receiverAddress: z.string().min(1, '收件人地址不能为空'), // 取消长度校验

  // 发件人信息
  senderName: z.string().min(1, '发件人姓名不能为空'),
  senderPhone: z.string().regex(phoneRegex, '发件人手机号格式错误（需11位）'),
  senderAddress: z.string().min(1, '发件人地址不能为空'), // 取消长度校验

  // 货物信息
  weight: z.coerce.number().pipe(z.number().positive('重量必须为正数')),
  quantity: z.coerce.number().pipe(z.number().int('件数必须为整数').positive('件数必须为正整数')),
  
  // 温层
  temperature: z.enum(TEMPERATURE_OPTIONS, {
    error: '温层必须是：常温、冷藏 或 冷冻',
  }),
});

export type GenericImportData = z.infer<typeof genericImportSchema>;
