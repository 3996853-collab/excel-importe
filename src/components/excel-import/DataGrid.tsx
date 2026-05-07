
'use client';

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useImportStore } from '@/store/useImportStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Trash2, Plus } from 'lucide-react';
import { getFieldLabel } from '@/lib/field-labels';
import { TEMPERATURE_OPTIONS } from '@/schemas/import-schema';

export function DataGrid() {
  const { rows, headers, updateCell, addRow, deleteRow } = useImportStore();

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'rowNum',
        header: '#',
        size: 50,
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground text-center">
            {row.index + 1}
          </div>
        ),
      },
      ...headers.map((header) => ({
        id: header,
        accessorKey: header,
        header: () => (
          <span className="font-bold text-xs">
            {getFieldLabel(header)}
          </span>
        ),
        cell: ({ row, getValue }: any) => {
          const value = getValue();
          const rowId = (row.original as any).id;
          const error = (row.original as any).errors[header];

          return (
            <div className="relative group flex items-center min-h-[40px] w-full border-r last:border-r-0">
              {header === 'temperature' ? (
                <Select
                  value={value || undefined}
                  onValueChange={(val) => updateCell(rowId, header, val)}
                >
                  <SelectTrigger className={`border-none h-9 w-full rounded-none px-2 text-sm focus:ring-0 ${error ? 'bg-destructive/10' : ''}`}>
                    <SelectValue placeholder="选择温层" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPERATURE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <EditableCell
                  value={value}
                  onBlur={(val) => updateCell(rowId, header, val)}
                  hasError={!!error}
                />
              )}
              
              {error && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 text-destructive cursor-help z-10 p-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] z-50">
                      <p className="text-xs">{error}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        size: 150,
      })),
      {
        id: 'actions',
        header: '操作',
        size: 60,
        cell: ({ row }: any) => (
          <div className="flex justify-center items-center w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteRow((row.original as any).id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ];
    return cols;
  }, [headers, updateCell, deleteRow]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>共 <strong>{rows.length}</strong> 行数据</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            {rows.filter(r => r.status === 'valid').length} 条正常
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            {rows.filter(r => r.status === 'invalid').length} 条有误
          </span>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm bg-card overflow-auto max-h-[600px]">
        <Table className="relative w-full border-collapse min-w-max">
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-0 border-r last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    <div className="px-2">{flexRender(header.column.columnDef.header, header.getContext())}</div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isInvalid = (row.original as any).status === 'invalid';
                return (
                  <TableRow
                    key={row.id}
                    className={isInvalid ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className="p-0 border-r last:border-r-0"
                        style={{ width: cell.column.columnDef.size }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Button
        variant="outline"
        className="w-full border-dashed text-muted-foreground hover:text-foreground h-10"
        onClick={addRow}
      >
        <Plus className="w-4 h-4 mr-2" />
        添加新行
      </Button>
    </div>
  );
}

interface EditableCellProps {
  value: any;
  onBlur: (val: string) => void;
  hasError: boolean;
}

function EditableCell({ value, onBlur, hasError }: EditableCellProps) {
  const [val, setVal] = React.useState(String(value ?? ''));

  React.useEffect(() => {
    setVal(String(value ?? ''));
  }, [value]);

  return (
    <Input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onBlur(val)}
      className={`
        border-none focus-visible:ring-1 focus-visible:ring-primary rounded-none h-9 w-full px-2.5 text-sm
        ${hasError ? 'bg-destructive/5 text-destructive font-medium pr-8' : 'bg-transparent'}
      `}
    />
  );
}
