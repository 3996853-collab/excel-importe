import * as XLSX from 'xlsx';

self.onmessage = async (e: MessageEvent) => {
  const { file } = e.data;

  if (!file) {
    self.postMessage({ type: 'ERROR', error: '未收到文件，请重新上传。' });
    return;
  }

  try {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);

        // Check for empty file
        if (data.length === 0) {
          self.postMessage({ type: 'ERROR', error: '文件内容为空，请检查后重新上传。' });
          return;
        }

        let workbook: XLSX.WorkBook;
        try {
          workbook = XLSX.read(data, { type: 'array' });
        } catch {
          self.postMessage({ type: 'ERROR', error: '文件解析失败，请确认文件未损坏或未加密。' });
          return;
        }

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          self.postMessage({ type: 'ERROR', error: '未找到有效的 Sheet，请检查文件结构。' });
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          self.postMessage({ type: 'ERROR', error: `Sheet "${firstSheetName}" 不存在或为空。` });
          return;
        }

        // Parse to 2D array (header: 1 = first row is headers)
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (json.length === 0) {
          self.postMessage({ type: 'ERROR', error: '文件没有任何数据，请检查后重新上传。' });
          return;
        }

        const headers = json[0] as string[];
        const rows = json.slice(1) as any[][];

        // Filter out completely empty rows
        const filteredRows = rows.filter(row =>
          row.some(cell => cell !== '' && cell !== null && cell !== undefined)
        );

        if (filteredRows.length === 0) {
          self.postMessage({ type: 'ERROR', error: '文件只有表头，没有数据行，请检查后重新上传。' });
          return;
        }

        if (!headers || headers.length === 0 || headers.every(h => h === '' || h == null)) {
          self.postMessage({ type: 'ERROR', error: '未检测到有效的表头，请确认第一行为列名。' });
          return;
        }

        self.postMessage({
          type: 'SUCCESS',
          payload: {
            headers: headers.map(h => String(h).trim()),
            rows: filteredRows,
            totalRows: filteredRows.length,
          }
        });
      } catch (parseError) {
        self.postMessage({ type: 'ERROR', error: `文件处理异常：${(parseError as Error).message}` });
      }
    };

    reader.onerror = () => {
      self.postMessage({ type: 'ERROR', error: '文件读取失败，请检查文件是否损坏。' });
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: `发生未知错误：${(error as Error).message}` });
  }
};
