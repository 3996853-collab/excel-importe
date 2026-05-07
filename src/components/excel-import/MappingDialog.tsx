
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
    // Attempt auto-mapping based on name similarity
    const initialMappings: Record<string, string> = {};
    headers.forEach((header) => {
      const match = targetFields.find(
        (field) => 
          field.toLowerCase() === header.toLowerCase() ||
          header.toLowerCase().includes(field.toLowerCase())
      );
      if (match) initialMappings[header] = match;
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
          <DialogTitle>Map Excel Columns</DialogTitle>
          <p className="text-sm text-muted-foreground">
            We couldn't fully recognize some columns. Please map them to the correct fields.
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
                  <SelectValue placeholder="Ignore this column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ignore">Ignore</SelectItem>
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
          <Button onClick={handleConfirm}>Start Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
