
import { create } from 'zustand';
import { ImportRow } from '@/types/import';
import { nanoid } from 'nanoid';

interface ImportState {
  headers: string[];
  rows: ImportRow[];
  progress: number;
  totalRows: number;
  isParsing: boolean;
  errorMap: Record<string, { row: number; field: string; msg: string }[]>;
  
  setImportData: (headers: string[], rawRows: any[][]) => void;
  updateCell: (rowId: string, field: string, value: any) => void;
  addRow: () => void;
  deleteRow: (rowId: string) => void;
  setRowStatus: (rowId: string, status: ImportRow['status']) => void;
  setErrors: (rowId: string, field: string, msg: string | null) => void;
  validateAll: () => void;
  setProgress: (progress: number) => void;
  setParsing: (isParsing: boolean) => void;
  clearImport: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  headers: [],
  rows: [],
  progress: 0,
  isParsing: false,
  errorMap: {},

  setImportData: (headers, rawRows) => {
    const rows: ImportRow[] = rawRows.map((rawRow) => {
      const data: Record<string, any> = {};
      headers.forEach((header, index) => {
        data[header] = rawRow[index];
      });
      return {
        id: nanoid(),
        data,
        errors: {},
        status: 'pending',
      };
    });
    set({ headers, rows, totalRows: rows.length, progress: 100, isParsing: false });
    get().validateAll();
  },

  updateCell: (rowId, field, value) => {
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === rowId ? { ...row, data: { ...row.data, [field]: value } } : row
      ),
    }));
  },

  addRow: () => {
    const { headers } = get();
    const newRow: ImportRow = {
      id: nanoid(),
      data: headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {}),
      errors: {},
      status: 'pending',
    };
    set((state) => ({ rows: [...state.rows, newRow] }));
    get().validateAll();
  },

  deleteRow: (rowId) => {
    set((state) => ({
      rows: state.rows.filter((row) => row.id !== rowId),
    }));
    get().validateAll();
  },

  setRowStatus: (rowId, status) => {
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === rowId ? { ...row, status } : row
      ),
    }));
  },

  validateAll: () => {
    const { rows, headers } = get();
    const { genericImportSchema } = require('@/schemas/import-schema');
    const newErrorMap: Record<string, { row: number; field: string; msg: string }[]> = {};
    const seenCodes = new Map<string, number>();

    const validatedRows = rows.map((row, idx) => {
      const errors: Record<string, string> = {};
      const rowNum = idx + 1;

      // Schema validation
      try {
        genericImportSchema.parse(row.data);
      } catch (e: any) {
        if (e.errors) {
          e.errors.forEach((err: any) => {
            const field = err.path[0] as string;
            errors[field] = err.message;
            if (!newErrorMap[row.id]) newErrorMap[row.id] = [];
            newErrorMap[row.id].push({ row: rowNum, field, msg: err.message });
          });
        }
      }

      // Duplicate detection (Internal)
      const code = row.data.externalCode;
      if (code) {
        if (seenCodes.has(code)) {
          const msg = `与第 ${seenCodes.get(code)} 行编码重复`;
          errors['externalCode'] = msg;
          if (!newErrorMap[row.id]) newErrorMap[row.id] = [];
          newErrorMap[row.id].push({ row: rowNum, field: 'externalCode', msg });
        } else {
          seenCodes.set(code, rowNum);
        }
      }

      return { ...row, errors, status: Object.keys(errors).length > 0 ? 'invalid' : 'valid' };
    });

    set({ rows: validatedRows, errorMap: newErrorMap });
  },

  setErrors: (rowId, field, msg) => {
    // This is now legacy since validateAll handles it, but kept for compatibility or fine-grained updates
    set((state) => {
      const newRows = state.rows.map((row) => {
        if (row.id === rowId) {
          const newErrors = { ...row.errors };
          if (msg) newErrors[field] = msg;
          else delete newErrors[field];
          return { ...row, errors: newErrors };
        }
        return row;
      });
      return { rows: newRows };
    });
  },

  setProgress: (progress) => set({ progress }),
  setParsing: (isParsing) => set({ isParsing }),
  clearImport: () => set({ headers: [], rows: [], progress: 0, errorMap: {} }),
}));
