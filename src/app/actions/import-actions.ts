
'use server';

import { genericImportSchema } from '@/schemas/import-schema';
// import { sql } from '@vercel/postgres'; // For Vercel Postgres/Neon

export async function checkDuplicates(externalCodes: string[]) {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Duplicate check is running in simulation mode.");
    return externalCodes.filter(code => code === 'ERR001');
  }

  // Real implementation example:
  // const { rows } = await sql`SELECT external_code FROM records WHERE external_code = ANY(${externalCodes})`;
  // return rows.map(r => r.external_code);
  
  return externalCodes.filter(code => code === 'ERR001');
}

export async function submitImport(data: any[]) {
  try {
    // Validate each row again on server side
    const validatedData = data.map(row => genericImportSchema.parse(row));
    
    // Check duplicates again
    const codes = validatedData.map(r => r.externalCode);
    const duplicates = await checkDuplicates(codes);
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate external codes found: ${duplicates.join(', ')}`);
    }

    // Insert into DB
    // await db.record.createMany({ data: validatedData });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
