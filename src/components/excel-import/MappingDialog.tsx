
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTemplateStore } from '@/store/useTemplateStore';
import { genericImportSchema } from '@/schemas/import-schema';

interface MappingDialogProps {
  headers: string[];
  open: boolean;
  onConfirm: (mappings: Record<string, string>) => void;
}

export function MappingDialog({ headers, open, onConfirm }: MappingDialogProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const targetFields = Object.keys(genericImportSchema.shape);

  useEffect(() => {
    const synonyms: Record<string, string[]> = {
      receiverName: ['收货人', '收件人', '姓名', 'Receiver', 'Name', 'Customer'],
      receiverPhone: ['电话', '手机', '联系方式', 'Phone', 'Mobile', 'Tel'],
      externalCode: ['订单号', '外部编码', '编码', 'Order No', 'Code'],
      weight: ['重量', '毛重', 'Weight', 'Wgt'],
      quantity: ['件数', '数量', 'Quantity', 'Qty'],
      temperature: ['温层', '温度', 'Temp', 'Temperature'],
      address: ['地址', '收货地址', 'Address'],
    };

    const initialMappings: Record<string, string> = {};
    headers.forEach((header) => {
      // 1. Exact match
      const exactMatch = targetFields.find(f => f.toLowerCase() === header.toLowerCase());
      if (exactMatch) {
        initialMappings[header] = exactMatch;
        return;
      }

      // 2. Synonym match
      for (const [field, list] of Object.entries(synonyms)) {
        if (list.some(s => header.toLowerCase().includes(s.toLowerCase()))) {
          initialMappings[header] = field;
          return;
        }
      }
    });
    setMappings(initialMappings);
  }, [headers]);

  const handleConfirm = () => {
    onConfirm(mappings);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>字段映射配置</DialogTitle>
          <p className="text-sm text-muted-foreground">
            部分列名未被自动识别，请手动建立 Excel 列与系统字段的对应关系。
          </p>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[400px] overflow-auto pr-2">
          {headers.map((header) => (
            <div key={header} className="grid grid-cols-2 items-center gap-4">
              <div className="font-medium text-sm truncate">{header}</div>
              <Select
                value={mappings[header] || 'ignore'}
                onValueChange={(val) => setMappings((prev) => ({ ...prev, [header]: val } as Record<string, string>))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="忽略此列" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ignore">忽略</SelectItem>
                  {targetFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm}>开始导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
