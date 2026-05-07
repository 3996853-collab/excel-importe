// 字段名 → 中文展示名称 映射表
export const FIELD_LABELS: Record<string, string> = {
  externalCode: '外部编码',
  receiverName: '收件人姓名',
  receiverPhone: '收件人电话',
  weight: '重量',
  quantity: '件数',
  temperature: '温层',
  address: '收货地址',
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}
