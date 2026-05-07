
'use server';

import { genericImportSchema } from '@/schemas/import-schema';
// import { sql } from '@vercel/postgres'; // For Vercel Postgres/Neon

// Mock database for demonstration (in-memory, will reset on dev server restart)
// In production, replace with: import { sql } from '@vercel/postgres';
let mockHistory: any[] = [];

export async function fetchHistory(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  externalCode?: string;
}) {
  const { page = 1, pageSize = 10, search, externalCode } = params;
  
  let filtered = [...mockHistory];

  if (search) {
    filtered = filtered.filter(item => 
      item.receiverName.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (externalCode) {
    filtered = filtered.filter(item => 
      item.externalCode.toLowerCase().includes(externalCode.toLowerCase())
    );
  }

  // Sort by time descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

export async function checkDuplicates(externalCodes: string[]) {
  // Check against mock database
  const existingCodes = mockHistory.map(item => item.externalCode);
  return externalCodes.filter(code => existingCodes.includes(code));
}

export async function submitImport(data: any[]) {
  try {
    const validatedData = data.map(row => {
      const parsed = genericImportSchema.parse(row);
      return {
        ...parsed,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
    });
    
    const codes = validatedData.map(r => r.externalCode);
    const duplicates = await checkDuplicates(codes);
    
    if (duplicates.length > 0) {
      return { success: false, error: `数据库中已存在以下外部编码: ${duplicates.join(', ')}` };
    }

    // Insert into mock DB
    mockHistory = [...validatedData, ...mockHistory];
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
