
import { create } from 'zustand';
import { ImportRow } from '@/types/import';
import { nanoid } from 'nanoid';

interface ImportState {
  headers: string[];
  rows: ImportRow[];
  progress: number;
  isParsing: boolean;
  errorMap: Record<string, { row: number; field: string; msg: string }[]>;
  
  setImportData: (headers: string[], rawRows: any[][]) => void;
  updateCell: (rowId: string, field: string, value: any) => void;
  setRowStatus: (rowId: string, status: ImportRow['status']) => void;
  setErrors: (rowId: string, field: string, msg: string | null) => void;
  setProgress: (progress: number) => void;
  setParsing: (isParsing: boolean) => void;
  clearImport: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
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
    set({ headers, rows, progress: 100, isParsing: false });
  },

  updateCell: (rowId, field, value) => {
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === rowId ? { ...row, data: { ...row.data, [field]: value } } : row
      ),
    }));
  },

  setRowStatus: (rowId, status) => {
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === rowId ? { ...row, status } : row
      ),
    }));
  },

  setErrors: (rowId, field, msg) => {
    set((state) => {
      const newRows = state.rows.map((row) => {
        if (row.id === rowId) {
          const newErrors = { ...row.errors };
          if (msg) {
            newErrors[field] = msg;
          } else {
            delete newErrors[field];
          }
          return { ...row, errors: newErrors };
        }
        return row;
      });

      // Update aggregate error map
      const rowIdx = state.rows.findIndex(r => r.id === rowId);
      const newErrorMap = { ...state.errorMap };
      if (msg) {
          if (!newErrorMap[rowId]) newErrorMap[rowId] = [];
          const existing = newErrorMap[rowId].find(e => e.field === field);
          if (existing) {
              existing.msg = msg;
          } else {
              newErrorMap[rowId].push({ row: rowIdx + 1, field, msg });
          }
      } else {
          if (newErrorMap[rowId]) {
              newErrorMap[rowId] = newErrorMap[rowId].filter(e => e.field !== field);
              if (newErrorMap[rowId].length === 0) delete newErrorMap[rowId];
          }
      }

      return { rows: newRows, errorMap: newErrorMap };
    });
  },

  setProgress: (progress) => set({ progress }),
  setParsing: (isParsing) => set({ isParsing }),
  clearImport: () => set({ headers: [], rows: [], progress: 0, errorMap: {} }),
}));
