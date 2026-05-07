
'use client';

import React, { useState } from 'react';
import { useImportStore } from '@/store/useImportStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { FileUploader } from './FileUploader';
import { DataGrid } from './DataGrid';
import { ErrorCollector } from './ErrorCollector';
import { MappingDialog } from './MappingDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft, Database, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { hashHeaders } from '@/lib/utils';
import { submitImport } from '@/app/actions/import-actions';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';

export function ImportWorkflow() {
  const { rows, clearImport, errorMap, setImportData } = useImportStore();
  const { getTemplate, saveTemplate } = useTemplateStore();
  
  const [showMapping, setShowMapping] = useState(false);
  const [pendingData, setPendingData] = useState<{ headers: string[]; rows: any[][] } | null>(null);

  const hasData = rows.length > 0;
  const hasErrors = Object.keys(errorMap).length > 0;

  const handleFileParsed = (rawHeaders: string[], rawRows: any[][]) => {
    const hash = hashHeaders(rawHeaders);
    const template = getTemplate(hash);

    if (template) {
      const mappedHeaders = rawHeaders.map(h => {
        const mapping = template.mappings.find(m => m.fileHeader === h);
        return mapping && mapping.targetField !== 'ignore' ? mapping.targetField : h;
      });
      setImportData(mappedHeaders, rawRows);
      toast.success('已识别模板并自动应用！');
    } else {
      setPendingData({ headers: rawHeaders, rows: rawRows });
      setShowMapping(true);
    }
  };

  const handleMappingConfirm = (mappings: Record<string, string>) => {
    if (!pendingData) return;

    const hash = hashHeaders(pendingData.headers);
    const mappingArray = Object.entries(mappings).map(([fileHeader, targetField]) => ({
      fileHeader,
      targetField
    }));

    saveTemplate(hash, mappingArray);

    const mappedHeaders = pendingData.headers.map(h => mappings[h] || h);
    setImportData(mappedHeaders, pendingData.rows);
    
    setShowMapping(false);
    setPendingData(null);
    toast.success('映射关系已保存并应用！');
  };

  const handleClear = () => {
    if (confirm('确定要清除所有数据并重新上传吗？')) {
      clearImport();
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  const handleExport = () => {
    const dataToExport = rows.map(r => r.data);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "exported_data.xlsx");
    toast.success('数据已成功导出！');
  };

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error('请在提交前修复所有校验错误。');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitProgress(10);
    const loadingToast = toast.loading('正在同步至数据库...');
    
    try {
      // Simulate progress
      const interval = setInterval(() => {
        setSubmitProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const dataToSubmit = rows.map(r => r.data);
      const result = await submitImport(dataToSubmit);
      
      clearInterval(interval);
      setSubmitProgress(100);

      if (result.success) {
        toast.success(`成功导入 ${rows.length} 条记录！`, { id: loadingToast });
        setTimeout(() => {
            clearImport();
            setIsSubmitting(false);
            setSubmitProgress(0);
        }, 500);
      } else {
        toast.error(`导入失败: ${result.error}`, { id: loadingToast });
        setIsSubmitting(false);
        setSubmitProgress(0);
      }
    } catch (error) {
      toast.error('同步过程中发生意外错误。', { id: loadingToast });
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <FileUploader onFileParsed={handleFileParsed} />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={isSubmitting}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回重新上传
                </Button>
                <h2 className="text-2xl font-bold tracking-tight">数据预览</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isSubmitting}>
                  <Download className="w-4 h-4 mr-2" />
                  导出修改后的数据
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={isSubmitting}>
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  清空列表
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={hasErrors || isSubmitting}>
                  <Database className="w-4 h-4 mr-2" />
                  提交 {rows.length} 条记录
                </Button>
              </div>
            </div>

            {isSubmitting && (
              <div className="space-y-2">
                <Progress value={submitProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  正在同步至数据库... {submitProgress}% ({Math.round(rows.length * submitProgress / 100)}/{rows.length})
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <DataGrid />
              </div>
              <div className="lg:col-span-1">
                <ErrorCollector />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MappingDialog 
        open={showMapping} 
        headers={pendingData?.headers || []} 
        onConfirm={handleMappingConfirm} 
      />
    </div>
  );
}
