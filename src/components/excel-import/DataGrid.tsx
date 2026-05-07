
'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useImportStore } from '@/store/useImportStore';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';
import { genericImportSchema } from '@/schemas/import-schema';

export function DataGrid() {
  const { rows, headers, updateCell, setErrors } = useImportStore();

  const columns = useMemo<ColumnDef<any>[]>(() => {
    return headers.map((header) => ({
      accessorKey: header,
      header: header,
      cell: ({ row, column, getValue }) => {
        const value = getValue();
        const rowId = (row.original as any).id;
        const error = (row.original as any).errors[header];

        return (
          <div className="relative group">
            <EditableCell
              value={value}
              onBlur={(val) => {
                updateCell(rowId, header, val);
                validateCell(rowId, header, val);
              }}
              hasError={!!error}
            />
            {error && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive cursor-help">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{error}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    }));
  }, [headers, updateCell]);

  const validateCell = (rowId: string, field: string, value: any) => {
    // Attempt validation for the specific field if it exists in schema
    try {
      const fieldSchema = (genericImportSchema.shape as any)[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(rowId, field, null);
      }
    } catch (e: any) {
      if (e.errors && e.errors[0]) {
        setErrors(rowId, field, e.errors[0].message);
      }
    }
  };

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-auto max-h-[600px]">
      <Table className="relative">
        <TableHeader className="sticky top-0 bg-secondary z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap font-bold">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-0 border-r last:border-r-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EditableCell({ 
  value, 
  onBlur, 
  hasError 
}: { 
  value: any, 
  onBlur: (val: any) => void, 
  hasError: boolean 
}) {
  const [val, setVal] = useState(value ?? '');

  return (
    <Input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onBlur(val)}
      className={`
        border-none focus-visible:ring-1 rounded-none h-10 w-full px-3
        ${hasError ? 'bg-destructive/10 text-destructive' : 'bg-transparent'}
      `}
    />
  );
}
