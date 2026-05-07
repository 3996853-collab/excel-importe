'use server';

import { genericImportSchema } from '@/schemas/import-schema';
import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// In-memory store (replace with real DB in production)
// In production: import { sql } from '@vercel/postgres'
// ---------------------------------------------------------------------------
let mockHistory: any[] = [];

// ---------------------------------------------------------------------------
// fetchHistory — supports search, filter, pagination
// ---------------------------------------------------------------------------
export async function fetchHistory(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  externalCode?: string;
}) {
  const { page = 1, pageSize = 10, search = '', externalCode = '' } = params;

  let filtered = [...mockHistory];

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(item =>
      (item.receiverName ?? '').toLowerCase().includes(q)
    );
  }

  if (externalCode.trim()) {
    const q = externalCode.trim().toLowerCase();
    filtered = filtered.filter(item =>
      (item.externalCode ?? '').toLowerCase().includes(q)
    );
  }

  // Sort by createdAt descending (most recent first)
  filtered.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    data,
    pagination: { total, page: safePage, pageSize, totalPages },
  };
}

// ---------------------------------------------------------------------------
// checkDuplicates — returns Set of codes already in DB
// ---------------------------------------------------------------------------
export async function checkDuplicates(externalCodes: string[]): Promise<string[]> {
  if (!externalCodes.length) return [];

  // --- Production example (Neon / Vercel Postgres) ---
  // const { rows } = await sql`
  //   SELECT external_code FROM waybills
  //   WHERE external_code = ANY(${externalCodes})
  // `;
  // return rows.map(r => r.external_code);

  const existing = new Set(mockHistory.map(item => item.externalCode));
  return externalCodes.filter(code => existing.has(code));
}

// ---------------------------------------------------------------------------
// submitImport — validates, deduplicates, persists
// Returns { successCount, failedCount, failedRows }
// ---------------------------------------------------------------------------
export async function submitImport(data: any[]): Promise<{
  success: boolean;
  successCount?: number;
  failedCount?: number;
  failedRows?: { externalCode: string; reason: string }[];
  error?: string;
}> {
  if (!data.length) {
    return { success: false, error: '没有数据可以提交。' };
  }

  const successRows: any[] = [];
  const failedRows: { externalCode: string; reason: string }[] = [];

  // Step 1: server-side validation (all rows)
  const validatedData: any[] = [];
  for (const row of data) {
    const result = genericImportSchema.safeParse(row);
    if (!result.success) {
      failedRows.push({
        externalCode: row.externalCode ?? '（未知）',
        reason: result.error.issues.map((e: { message: string }) => e.message).join('；'),
      });
    } else {
      validatedData.push(result.data);
    }
  }

  if (validatedData.length === 0) {
    return {
      success: false,
      successCount: 0,
      failedCount: failedRows.length,
      failedRows,
      error: '所有行校验失败，无可提交数据。',
    };
  }

  // Step 2: duplicate check against DB
  const codes = validatedData.map(r => r.externalCode);
  const duplicates = await checkDuplicates(codes);
  if (duplicates.length > 0) {
    duplicates.forEach(code => {
      failedRows.push({
        externalCode: code,
        reason: '该外部编码已存在于数据库（重复提交）',
      });
    });
  }

  // Step 3: insert only non-duplicate rows
  const toInsert = validatedData.filter(r => !duplicates.includes(r.externalCode));
  toInsert.forEach(row => {
    mockHistory.push({
      ...row,
      id: nanoid(),
      createdAt: new Date().toISOString(),
    });
    successRows.push(row);
  });

  return {
    success: true,
    successCount: successRows.length,
    failedCount: failedRows.length,
    failedRows: failedRows.length ? failedRows : undefined,
  };
}
