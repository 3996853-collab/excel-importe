'use server';

import { genericImportSchema } from '@/schemas/import-schema';
import { nanoid } from 'nanoid';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Mock Store (Used ONLY if no database is connected)
// ---------------------------------------------------------------------------
const globalForMock = global as unknown as { mockHistory: any[] };
let mockHistory = globalForMock.mockHistory || [];
if (process.env.NODE_ENV !== 'production') globalForMock.mockHistory = mockHistory;

const IS_DB_CONNECTED = !!process.env.POSTGRES_URL;

// ---------------------------------------------------------------------------
// fetchHistory — 智能切换 数据库 / 模拟存储
// ---------------------------------------------------------------------------
export async function fetchHistory(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  externalCode?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { 
    page = 1, 
    pageSize = 10, 
    search = '', 
    externalCode = '',
    startDate = '',
    endDate = ''
  } = params;

  if (IS_DB_CONNECTED) {
    try {
      const offset = (page - 1) * pageSize;
      const searchQuery = `%${search}%`;
      const codeQuery = `%${externalCode}%`;
      const dbStartDate = startDate || null;
      const dbEndDate = endDate || null;

      const { rows } = await sql`
        SELECT * FROM waybills
        WHERE (receiver_name ILIKE ${searchQuery} OR ${search} = '')
        AND (external_code ILIKE ${codeQuery} OR ${externalCode} = '')
        AND (${dbStartDate}::timestamp IS NULL OR COALESCE(created_at, '1970-01-01') >= ${dbStartDate}::timestamp)
        AND (${dbEndDate}::timestamp IS NULL OR COALESCE(created_at, '1970-01-01') <= (${dbEndDate}::timestamp + interval '1 day'))
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT count(*) FROM waybills
        WHERE (receiver_name ILIKE ${searchQuery} OR ${search} = '')
        AND (external_code ILIKE ${codeQuery} OR ${externalCode} = '')
        AND (${dbStartDate}::timestamp IS NULL OR COALESCE(created_at, '1970-01-01') >= ${dbStartDate}::timestamp)
        AND (${dbEndDate}::timestamp IS NULL OR COALESCE(created_at, '1970-01-01') <= (${dbEndDate}::timestamp + interval '1 day'))
      `;
      
      const total = parseInt(countResult.rows[0].count);
      return {
        data: rows.map(r => ({
            ...r,
            receiverName: r.receiver_name,
            receiverPhone: r.receiver_phone,
            receiverAddress: r.receiver_address,
            senderName: r.sender_name,
            senderPhone: r.sender_phone,
            senderAddress: r.sender_address,
            externalCode: r.external_code,
            createdAt: r.created_at
        })),
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      };
    } catch (e) {
      console.error('DB Fetch Error, falling back to mock:', e);
    }
  }

  // --- Mock Fallback ---
  let filtered = [...mockHistory];
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(item => (item.receiverName ?? '').toLowerCase().includes(q));
  }
  if (externalCode.trim()) {
    const q = externalCode.trim().toLowerCase();
    filtered = filtered.filter(item => (item.externalCode ?? '').toLowerCase().includes(q));
  }
  if (startDate) {
    const start = new Date(startDate).getTime();
    filtered = filtered.filter(item => new Date(item.createdAt).getTime() >= start);
  }
  if (endDate) {
    const end = new Date(endDate).getTime() + 86400000; // Add 24 hours
    filtered = filtered.filter(item => new Date(item.createdAt).getTime() < end);
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { data, pagination: { total, page, pageSize, totalPages } };
}

// ---------------------------------------------------------------------------
// submitImport — 批量持久化
// ---------------------------------------------------------------------------
export async function submitImport(data: any[]) {
  if (!data.length) return { success: false, error: '没有数据可以提交。' };

  const successRows: any[] = [];
  const failedRows: any[] = [];
  const targetFields = Object.keys(genericImportSchema.shape);

  for (const row of data) {
    const dataToValidate = { ...row };
    targetFields.forEach(f => { if (dataToValidate[f] === undefined) dataToValidate[f] = ''; });

    const result = genericImportSchema.safeParse(dataToValidate);
    if (!result.success) {
      failedRows.push({ externalCode: row.externalCode || '未知', reason: '格式校验不通过' });
      continue;
    }

    if (IS_DB_CONNECTED) {
      try {
        const d = result.data;
        // If externalCode is empty string, set to null for DB to avoid UNIQUE constraint conflicts with other empty strings
        const dbExternalCode = d.externalCode?.trim() === '' ? null : d.externalCode;

        await sql`
          INSERT INTO waybills (
            id, external_code, receiver_name, receiver_phone, receiver_address,
            sender_name, sender_phone, sender_address, weight, quantity, temperature, created_at
          ) VALUES (
            ${nanoid()}, ${dbExternalCode}, ${d.receiverName}, ${d.receiverPhone}, ${d.receiverAddress},
            ${d.senderName}, ${d.senderPhone}, ${d.senderAddress}, ${d.weight}, ${d.quantity}, ${d.temperature}, NOW()
          ) ON CONFLICT (external_code) DO UPDATE SET
            receiver_name = EXCLUDED.receiver_name,
            receiver_phone = EXCLUDED.receiver_phone,
            receiver_address = EXCLUDED.receiver_address,
            sender_name = EXCLUDED.sender_name,
            sender_phone = EXCLUDED.sender_phone,
            sender_address = EXCLUDED.sender_address,
            weight = EXCLUDED.weight,
            quantity = EXCLUDED.quantity,
            temperature = EXCLUDED.temperature
        `;
        successRows.push(d);
      } catch (e: any) {
        console.error('Database write failed for row:', row.externalCode, e);
        // Return detailed error for debugging
        const detail = e.detail || '';
        const message = e.message || '';
        failedRows.push({ 
          externalCode: row.externalCode || '未知', 
          reason: `数据库报错: ${message} ${detail}` 
        });
      }
    } else {
      const newEntry = { ...result.data, id: nanoid(), createdAt: new Date().toISOString() };
      mockHistory.push(newEntry);
      successRows.push(newEntry);
    }
  }

  revalidatePath('/history');
  return {
    success: true,
    successCount: successRows.length,
    failedCount: failedRows.length,
    failedRows: failedRows.length ? failedRows : undefined
  };
}

export async function checkDuplicates(codes: string[]): Promise<string[]> {
    if (!codes.length) return [];
    if (IS_DB_CONNECTED) {
        try {
            const { rows } = await sql.query(
              'SELECT external_code FROM waybills WHERE external_code = ANY($1)',
              [codes]
            );
            return rows.map(r => r.external_code);
        } catch { return []; }
    }
    const existing = new Set(mockHistory.map(item => item.externalCode));
    return codes.filter(code => existing.has(code));
}
