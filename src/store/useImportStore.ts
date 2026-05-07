
import { create } from 'zustand';
import { ImportRow } from '@/types/import';
import { nanoid } from 'nanoid';

interface ErrorEntry {
  row: number;
  field: string;
  msg: string;
}

interface ImportState {
  headers: string[];
  rows: ImportRow[];
  progress: number;
  totalRows: number;
  isParsing: boolean;
  errorMap: Record<string, ErrorEntry[]>;

  setImportData: (headers: string[], rawRows: any[][], totalRows?: number) => void;
  updateCell: (rowId: string, field: string, value: any) => void;
  addRow: () => void;
  deleteRow: (rowId: string) => void;
  setRowStatus: (rowId: string, status: ImportRow['status']) => void;
  setErrors: (rowId: string, field: string, msg: string | null) => void;
  validateAll: (existingCodes?: Set<string>) => void;
  setProgress: (progress: number) => void;
  setParsing: (isParsing: boolean) => void;
  clearImport: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  headers: [],
  rows: [],
  progress: 0,
  totalRows: 0,
  isParsing: false,
  errorMap: {},

  setImportData: (headers, rawRows, total) => {
    const rows: ImportRow[] = rawRows.map((rawRow) => {
      const data: Record<string, any> = {};
      headers.forEach((header, index) => {
        data[header] = rawRow[index] ?? '';
      });
      return {
        id: nanoid(),
        data,
        errors: {},
        status: 'pending',
      };
    });
    set({ headers, rows, totalRows: total ?? rows.length, progress: 100, isParsing: false });
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

  validateAll: (existingCodes?: Set<string>) => {
    const { rows } = get();
    // Use dynamic require to avoid circular deps in Zustand
    const { genericImportSchema } = require('@/schemas/import-schema');

    const newErrorMap: Record<string, ErrorEntry[]> = {};
    const seenCodes = new Map<string, number>(); // code → first row number

    const validatedRows = rows.map((row, idx) => {
      const errors: Record<string, string> = {};
      const rowNum = idx + 1;

      // 1. Zod schema validation — collect ALL errors at once
      const result = genericImportSchema.safeParse(row.data);
      if (!result.success) {
        result.error.errors.forEach((err: any) => {
          const field = err.path[0] as string;
          if (field && !errors[field]) {   // first error per field wins
            errors[field] = err.message;
            if (!newErrorMap[row.id]) newErrorMap[row.id] = [];
            newErrorMap[row.id].push({ row: rowNum, field, msg: err.message });
          }
        });
      }

      // 2. In-batch duplicate detection
      const code = row.data.externalCode;
      if (code && String(code).trim() !== '') {
        const codeStr = String(code).trim();
        if (seenCodes.has(codeStr)) {
          const firstRow = seenCodes.get(codeStr)!;
          const msg = `与第 ${firstRow} 行的外部编码重复`;
          errors['externalCode'] = msg;
          if (!newErrorMap[row.id]) newErrorMap[row.id] = [];
          // Avoid duplicating same error
          const alreadyHas = newErrorMap[row.id].some(e => e.field === 'externalCode');
          if (!alreadyHas) {
            newErrorMap[row.id].push({ row: rowNum, field: 'externalCode', msg });
          }
        } else {
          seenCodes.set(codeStr, rowNum);
        }
      }

      // 3. Database existing codes check (if provided)
      if (existingCodes && code) {
        const codeStr = String(code).trim();
        if (existingCodes.has(codeStr) && !errors['externalCode']) {
          const msg = '该外部编码已存在于数据库（历史数据重复）';
          errors['externalCode'] = msg;
          if (!newErrorMap[row.id]) newErrorMap[row.id] = [];
          newErrorMap[row.id].push({ row: rowNum, field: 'externalCode', msg });
        }
      }

      return {
        ...row,
        errors,
        status: (Object.keys(errors).length > 0 ? 'invalid' : 'valid') as ImportRow['status'],
      };
    });

    set({ rows: validatedRows, errorMap: newErrorMap });
  },

  setErrors: (rowId, field, msg) => {
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
  clearImport: () => set({ headers: [], rows: [], progress: 0, totalRows: 0, errorMap: {} }),
}));
