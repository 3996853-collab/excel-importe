
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { genericImportSchema } from '@/schemas/import-schema';
import { getFieldLabel } from '@/lib/field-labels';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

// All required target fields with their Chinese labels
const TARGET_FIELDS = Object.keys(genericImportSchema.shape);

// Comprehensive synonym dictionary for auto-mapping
const SYNONYMS: Record<string, string[]> = {
  externalCode:    ['外部编码', '外部订单号', '客户单号', '订单号', '单号', '编码', 'Ref Code', 'Order No', 'Code', 'OrderId', 'ExternalCode'],
  receiverName:    ['收货人', '收件人', '收件人姓名', '收货人姓名', 'Receiver', 'Receiver Name', 'Customer'],
  receiverPhone:   ['收件人电话', '收货人电话', '收货电话', '收件手机', '收货手机', 'Receiver Phone', 'Receiver Tel'],
  receiverAddress: ['收货地址', '收件地址', '目的地', 'Receiver Address', 'Delivery Address'],
  senderName:      ['发件人', '寄件人', '发货人', '发件人姓名', 'Sender', 'Sender Name'],
  senderPhone:     ['发件人电话', '寄件人电话', '发货电话', '发货手机', 'Sender Phone', 'Sender Tel'],
  senderAddress:   ['发件地址', '寄件地址', '发货地址', '始发地', 'Sender Address', 'Origin Address'],
  weight:          ['重量(kg)', '重量', '重量kg', '重量KG', '毛重', '货重', 'Weight(kg)', 'Weight', 'Wgt', 'Gross Weight'],
  quantity:        ['件数', '数量', '箱数', 'Quantity', 'Qty', 'Pieces'],
  temperature:     ['温层', '温度要求', '温层要求', '温度', 'Temp Zone', 'Temperature', 'Temp'],
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .replace(/[()（）[\]【】]/g, '');
}

function autoMap(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  const synonymEntries = Object.entries(SYNONYMS)
    .flatMap(([field, synonyms]) =>
      synonyms.map((synonym) => ({
        field,
        synonym,
        normalized: normalizeHeader(synonym),
      }))
    )
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);

    // Exact system-field match first
    const exactField = TARGET_FIELDS.find((field) => normalizeHeader(field) === normalizedHeader);
    if (exactField) {
      result[header] = exactField;
      continue;
    }

    // Then exact/longest synonym match to avoid broad matches like "收件人" eating "收件人电话"
    for (const entry of synonymEntries) {
      if (!entry.normalized) continue;
      if (
        normalizedHeader === entry.normalized ||
        normalizedHeader.includes(entry.normalized) ||
        entry.normalized.includes(normalizedHeader)
      ) {
        result[header] = entry.field;
        break;
      }
    }
  }
  return result;
}

interface MappingDialogProps {
  headers: string[];
  open: boolean;
  onConfirm: (mappings: Record<string, string>) => void;
  onCancel?: () => void;
}

export function MappingDialog({ headers, open, onConfirm, onCancel }: MappingDialogProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Re-run auto-map whenever headers change
  useEffect(() => {
    if (headers.length > 0) {
      setMappings(autoMap(headers));
    }
  }, [headers]);

  // Count how many required fields are mapped
  const mappedFields = new Set(Object.values(mappings).filter(v => v !== 'ignore'));
  const unmappedRequired = TARGET_FIELDS.filter(f => !mappedFields.has(f));
  const canConfirm = unmappedRequired.length === 0;

  const handleConfirm = () => {
    onConfirm(mappings);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && onCancel) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>字段映射配置</DialogTitle>
          </div>
          <DialogDescription>
            请将 Excel 列名与系统字段对应。带 <span className="text-destructive">*</span> 的字段为必填。
          </DialogDescription>
        </DialogHeader>

        {/* Mapping status */}
        <div className="flex items-center gap-2 flex-wrap">
          {canConfirm ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              所有必填字段已映射，可以开始导入
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              尚有 {unmappedRequired.length} 个必填字段未映射：
              {unmappedRequired.map(f => (
                <Badge key={f} variant="outline" className="text-xs text-destructive border-destructive/40">
                  {getFieldLabel(f)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Mapping rows */}
        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {/* Header labels */}
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground pb-1 border-b">
            <span>Excel 列名</span>
            <span>对应系统字段</span>
          </div>

          {headers.map((header) => {
            const mapped = mappings[header];
            const isIgnored = !mapped || mapped === 'ignore';
            const isRequired = mapped && mapped !== 'ignore' && TARGET_FIELDS.includes(mapped);

            return (
              <div key={header} className="grid grid-cols-2 items-center gap-4">
                <div className={`text-sm font-medium truncate px-2 py-1 rounded ${isIgnored ? 'text-muted-foreground' : ''}`}>
                  {header}
                </div>
                <Select
                  value={mappings[header] || 'ignore'}
                  onValueChange={(val: string | null) =>
                    setMappings((prev) => ({ ...prev, [header]: val || 'ignore' }))
                  }
                >
                  <SelectTrigger className={isIgnored ? 'border-dashed opacity-60' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">
                      <span className="text-muted-foreground">— 忽略此列 —</span>
                    </SelectItem>
                    {TARGET_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        <span>{getFieldLabel(field)}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">({field})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
