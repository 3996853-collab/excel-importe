
'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
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
import { AlertCircle, Trash2, Plus } from 'lucide-react';
import { genericImportSchema } from '@/schemas/import-schema';

export function DataGrid() {
  const { rows, headers, updateCell, validateAll, addRow, deleteRow } = useImportStore();

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => deleteRow((row.original as any).id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
      ...headers.map((header) => ({
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
                  validateAll();
                }}
                hasError={!!error}
              />
              {error && (
                <Tooltip>
                  <TooltipTrigger asChild>
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
      }))
    ];
    return cols;
  }, [headers, updateCell, validateAll, deleteRow]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-auto max-h-[600px]">
        <Table className="relative">
          <TableHeader className="sticky top-0 bg-secondary z-20">
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
      <Button 
        variant="outline" 
        className="w-full border-dashed" 
        onClick={addRow}
      >
        <Plus className="w-4 h-4 mr-2" />
        添加新行
      </Button>
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
