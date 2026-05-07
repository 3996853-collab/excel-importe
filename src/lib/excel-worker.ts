
import * as XLSX from 'xlsx';

self.onmessage = async (e: MessageEvent) => {
  const { file, options } = e.data;
  
  try {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse to JSON
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Send back headers and data
      self.postMessage({ 
        type: 'SUCCESS', 
        payload: {
          headers: json[0],
          rows: json.slice(1)
        } 
      });
    };
    
    reader.onerror = () => {
      self.postMessage({ type: 'ERROR', error: 'Failed to read file' });
    };
    
    reader.readAsArrayBuffer(file);
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
