
'use client';

import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImportStore } from '@/store/useImportStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export function FileUploader({ onFileParsed }: { onFileParsed: (headers: string[], rows: any[][]) => void }) {
  const { setProgress, setParsing, progress, isParsing } = useImportStore();
  const workerRef = useRef<Worker | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParsing(true);
    setProgress(0);

    // Initialize Worker
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../../lib/excel-worker.ts', import.meta.url));
    }

    workerRef.current.onmessage = (e) => {
      const { type, payload, error } = e.data;
      if (type === 'SUCCESS') {
        onFileParsed(payload.headers, payload.rows);
        setParsing(false);
      } else if (type === 'ERROR') {
        toast.error(`Error: ${error}`);
        setParsing(false);
      }
    };

    workerRef.current.postMessage({ file });
    
    // Simulate progress for UI feedback during read
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      if (p >= 90) clearInterval(interval);
      setProgress(p);
    }, 100);

  }, [onFileParsed, setParsing, setProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12
            flex flex-col items-center justify-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}
          `}
        >
        <input {...getInputProps()} />
        
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          {isParsing ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isParsing ? '正在解析 Excel...' : '上传 Excel 文件'}
        </h3>
        <p className="text-muted-foreground text-center">
          拖拽 .xlsx 或 .csv 文件到此处，或点击选择文件
        </p>
        
        {isParsing && (
          <div className="w-full mt-8 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              正在解析... {progress}%
            </p>
          </div>
        )}
      </div>
    </motion.div>
    </div>
  );
}
