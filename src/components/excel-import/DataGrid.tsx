
'use client';

import React, { useMemo, useRef, useCallback } from 'react';
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
import { getFieldLabel } from '@/lib/field-labels';

export function DataGrid() {
  const { rows, headers, updateCell, validateAll, addRow, deleteRow } = useImportStore();

  // Flat list of all cell input refs for Tab navigation: [rowIdx][colIdx]
  const cellRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    const row = cellRefs.current[rowIdx];
    if (row && row[colIdx]) {
      row[colIdx]!.focus();
    }
  }, []);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const direction = e.shiftKey ? -1 : 1;
        const totalCols = headers.length;
        const totalRows = rows.length;

        let nextCol = colIdx + direction;
        let nextRow = rowIdx;

        if (nextCol >= totalCols) {
          nextCol = 0;
          nextRow += 1;
        } else if (nextCol < 0) {
          nextCol = totalCols - 1;
          nextRow -= 1;
        }

        if (nextRow >= 0 && nextRow < totalRows) {
          focusCell(nextRow, nextCol);
        }
      }
    },
    [headers.length, rows.length, focusCell]
  );

  const columns = useMemo<ColumnDef<any>[]>(() => {
    // Ensure refs array is sized correctly
    cellRefs.current = rows.map((_, rIdx) =>
      headers.map((_, cIdx) => cellRefs.current[rIdx]?.[cIdx] ?? null)
    );

    const cols: ColumnDef<any>[] = [
      {
        id: 'rowNum',
        header: '#',
        size: 50,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground px-2 select-none">
            {row.index + 1}
          </span>
        ),
      },
      ...headers.map((header, colIdx) => ({
        accessorKey: header,
        header: () => (
          <span title={header}>
            {getFieldLabel(header)}
          </span>
        ),
        cell: ({ row, getValue }: any) => {
          const value = getValue();
          const rowId = (row.original as any).id;
          const rowIdx = row.index;
          const error = (row.original as any).errors[header];

          return (
            <div className="relative group">
              <EditableCell
                value={value}
                inputRef={(el) => {
                  if (!cellRefs.current[rowIdx]) cellRefs.current[rowIdx] = [];
                  cellRefs.current[rowIdx][colIdx] = el;
                }}
                onBlur={(val) => {
                  updateCell(rowId, header, val);
                  validateAll();
                }}
                onTabKeyDown={(e) => handleTabKeyDown(e, rowIdx, colIdx)}
                hasError={!!error}
              />
              {error && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-destructive cursor-help z-10">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{error}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      })),
      {
        id: 'actions',
        header: '操作',
        size: 60,
        cell: ({ row }: any) => (
          <div className="flex justify-center">
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
  }, [headers, rows, updateCell, validateAll, deleteRow, handleTabKeyDown]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>共 <strong>{rows.length}</strong> 行数据</span>
        <span>
          {rows.filter(r => r.status === 'valid').length} 行正常 /&nbsp;
          {rows.filter(r => r.status === 'invalid').length} 行有误
        </span>
      </div>

      <div className="rounded-lg border overflow-auto max-h-[580px] shadow-sm">
        <Table className="relative min-w-max">
          <TableHeader className="sticky top-0 bg-card z-20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="whitespace-nowrap font-bold text-xs h-10 px-2"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    (row.original as any).status === 'invalid'
                      ? 'bg-destructive/5 hover:bg-destructive/10'
                      : 'hover:bg-muted/40'
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-0 border-r last:border-r-0 h-10">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button
        variant="outline"
        className="w-full border-dashed text-muted-foreground hover:text-foreground h-9"
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
  onTabKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hasError: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
}

function EditableCell({ value, onBlur, onTabKeyDown, hasError, inputRef }: EditableCellProps) {
  const [val, setVal] = React.useState(String(value ?? ''));

  // Sync external value changes (e.g., when store is reset)
  React.useEffect(() => {
    setVal(String(value ?? ''));
  }, [value]);

  return (
    <Input
      ref={inputRef}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onBlur(val)}
      onKeyDown={onTabKeyDown}
      className={`
        border-none focus-visible:ring-1 focus-visible:ring-primary rounded-none h-10 w-full px-2.5 text-sm
        ${hasError ? 'bg-destructive/10 text-destructive pr-7' : 'bg-transparent'}
      `}
    />
  );
}
