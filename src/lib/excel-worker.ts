import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Helper: detect which row is the actual header row
// Strategy: scan first 10 rows, find the row with the most non-empty
//           string cells that look like column labels.
// -----------------------------------------------------------------------
function detectHeaderRow(rows: any[][]): { index: number; score: number } {
  const MAX_SCAN = 10;
  let bestScore = -1;
  let bestIdx = 0;

  for (let i = 0; i < Math.min(rows.length, MAX_SCAN); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    let score = 0;
    for (const cell of row) {
      if (cell === null || cell === undefined || cell === '') continue;
      const s = String(cell).trim();
      if (s === '') continue;
      // Headers are usually short strings, not numbers or dates
      if (isNaN(Number(s)) && s.length < 50) score += 2;
      else score += 0.5; 
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return { index: bestIdx, score: bestScore };
}

// -----------------------------------------------------------------------
// Helper: evaluate a worksheet's "quality"
// Returns a score based on number of valid-looking rows.
// -----------------------------------------------------------------------
function evaluateSheet(ws: XLSX.WorkSheet): { headerIdx: number; rowCount: number; score: number; data: any[][] } {
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as any[][];

  if (rows.length === 0) return { headerIdx: 0, rowCount: 0, score: 0, data: [] };

  const { index: headerIdx, score: headerScore } = detectHeaderRow(rows);
  const dataRows = rows.slice(headerIdx + 1);
  
  // Filter completely empty rows
  const validRows = dataRows.filter(row =>
    row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
  );

  // Final score: header quality * number of valid data rows
  const totalScore = headerScore * validRows.length;

  return { 
    headerIdx, 
    rowCount: validRows.length, 
    score: totalScore, 
    data: rows 
  };
}

// -----------------------------------------------------------------------
// Main worker message handler
// -----------------------------------------------------------------------
self.onmessage = (e: MessageEvent) => {
  const { file } = e.data;

  if (!file) {
    self.postMessage({ type: 'ERROR', error: '未收到文件，请重新上传。' });
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const data = new Uint8Array(arrayBuffer);

      if (data.length === 0) {
        self.postMessage({ type: 'ERROR', error: '文件内容为空，请检查后重新上传。' });
        return;
      }

      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        self.postMessage({ type: 'ERROR', error: '未找到任何 Sheet，请检查文件结构。' });
        return;
      }

      // ── Scan ALL sheets and find the best candidate ──
      let bestSheet: { name: string; headerIdx: number; rows: any[][]; score: number } | null = null;

      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;

        const evaluation = evaluateSheet(ws);
        if (!bestSheet || evaluation.score > bestSheet.score) {
          bestSheet = {
            name: sheetName,
            headerIdx: evaluation.headerIdx,
            rows: evaluation.data,
            score: evaluation.score
          };
        }
      }

      if (!bestSheet || bestSheet.score === 0) {
        self.postMessage({ type: 'ERROR', error: '未能在任何 Sheet 中识别到有效的运单数据。' });
        return;
      }

      const rawHeaders = bestSheet.rows[bestSheet.headerIdx] as string[];
      const dataRows = bestSheet.rows.slice(bestSheet.headerIdx + 1);

      // Final cleanup of data rows
      const filteredRows = dataRows.filter(row =>
        row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
      );

      self.postMessage({
        type: 'SUCCESS',
        payload: {
          headers: rawHeaders.map((h: any) => String(h ?? '').trim()),
          rows: filteredRows,
          totalRows: filteredRows.length,
          sheetName: bestSheet.name,
          headerRowIdx: bestSheet.headerIdx,
        },
      });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: `解析异常：${(err as Error).message}` });
    }
  };

  reader.onerror = () => {
    self.postMessage({ type: 'ERROR', error: '文件读取失败。' });
  };

  reader.readAsArrayBuffer(file);
};
