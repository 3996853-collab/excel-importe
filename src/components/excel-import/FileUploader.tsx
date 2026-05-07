
'use client';

import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2, FileX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImportStore } from '@/store/useImportStore';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export function FileUploader({ onFileParsed }: { onFileParsed: (headers: string[], rows: any[][], totalRows: number) => void }) {
  const { setProgress, setParsing, progress, isParsing, totalRows } = useImportStore();
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParsing(true);
    setProgress(0);

    // Initialize Worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    workerRef.current = new Worker(new URL('../../lib/excel-worker.ts', import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { type, payload, error } = e.data;
      if (intervalRef.current) clearInterval(intervalRef.current);

      if (type === 'SUCCESS') {
        setProgress(100);
        onFileParsed(payload.headers, payload.rows, payload.totalRows);
        setParsing(false);
      } else if (type === 'ERROR') {
        toast.error(error || '文件解析失败，请检查后重试。');
        setParsing(false);
        setProgress(0);
      }
    };

    workerRef.current.onerror = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      toast.error('Worker 启动失败，请刷新页面后重试。');
      setParsing(false);
      setProgress(0);
    };

    workerRef.current.postMessage({ file });

    // Simulate smooth progress for UI feedback
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += 8;
      if (p >= 88) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setProgress(p);
      }
    }, 120);

  }, [onFileParsed, setParsing, setProgress]);

  const onDropRejected = useCallback(() => {
    toast.error('不支持的文件格式，仅支持 .xlsx 和 .xls 格式。');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: isParsing,
  });

  const parsedCount = totalRows > 0 ? Math.round(totalRows * progress / 100) : null;

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <motion.div
        whileHover={{ scale: isParsing ? 1 : 1.01 }}
        whileTap={{ scale: isParsing ? 1 : 0.99 }}
      >
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12
            flex flex-col items-center justify-center cursor-pointer
            transition-colors duration-200
            ${isParsing ? 'cursor-not-allowed opacity-70' : ''}
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
          <p className="text-muted-foreground text-center text-sm">
            {isParsing
              ? '请稍候，正在处理数据...'
              : '拖拽 .xlsx 或 .xls 文件到此处，或点击选择文件'}
          </p>

          {isParsing && (
            <div className="w-full mt-8 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {parsedCount !== null
                  ? `正在解析... ${progress}%（${parsedCount} / ${totalRows} 条）`
                  : `正在解析... ${progress}%`
                }
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>支持 .xlsx / .xls 格式</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileX className="w-3.5 h-3.5" />
          <span>不支持加密文件</span>
        </div>
      </div>
    </div>
  );
}
