
'use client';

import React, { useState, useCallback } from 'react';
import { useImportStore } from '@/store/useImportStore';
import { useTemplateStore } from '@/store/useTemplateStore';
import { FileUploader } from './FileUploader';
import { DataGrid } from './DataGrid';
import { ErrorCollector } from './ErrorCollector';
import { MappingDialog } from './MappingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ArrowLeft, Send, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { hashHeaders } from '@/lib/utils';
import { submitImport, checkDuplicates } from '@/app/actions/import-actions';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';

export function ImportWorkflow() {
  const { rows, headers, clearImport, errorMap, setImportData, validateAll } = useImportStore();
  const { getTemplate, saveTemplate } = useTemplateStore();

  const [showMapping, setShowMapping] = useState(false);
  const [pendingData, setPendingData] = useState<{ headers: string[]; rows: any[][]; totalRows: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResult, setSubmitResult] = useState<{
    successCount: number;
    failedCount: number;
    failedRows?: { externalCode: string; reason: string }[];
  } | null>(null);

  const hasData = rows.length > 0;
  const hasErrors = Object.keys(errorMap).length > 0;
  const errorCount = Object.values(errorMap).flat().length;

  // ----------------------------------------------------------------
  // After import data is set — check duplicates against DB
  // ----------------------------------------------------------------
  const runDbDuplicateCheck = useCallback(async () => {
    const currentRows = useImportStore.getState().rows;
    const codes = currentRows
      .map(r => r.data.externalCode)
      .filter(Boolean)
      .map(String);

    if (!codes.length) return;

    try {
      const duplicates = await checkDuplicates(codes);
      if (duplicates.length > 0) {
        const existingSet = new Set(duplicates);
        validateAll(existingSet);
        toast.warning(`检测到 ${duplicates.length} 个外部编码已存在于数据库，已在预览中标红。`);
      }
    } catch {
      // non-blocking — DB check failure should not block preview
    }
  }, [validateAll]);

  // ----------------------------------------------------------------
  // File parsed callback
  // ----------------------------------------------------------------
  const handleFileParsed = useCallback(
    (rawHeaders: string[], rawRows: any[][], totalRows: number) => {
      const hash = hashHeaders(rawHeaders);
      const template = getTemplate(hash);

      if (template) {
        const mappedHeaders = rawHeaders.map(h => {
          const mapping = template.mappings.find(m => m.fileHeader === h);
          return mapping && mapping.targetField !== 'ignore' ? mapping.targetField : h;
        });
        setImportData(mappedHeaders, rawRows, totalRows);
        toast.success(`已识别记忆模板，自动应用映射规则！共 ${totalRows} 条数据。`);
        runDbDuplicateCheck();
      } else {
        setPendingData({ headers: rawHeaders, rows: rawRows, totalRows });
        setShowMapping(true);
      }
    },
    [getTemplate, setImportData, runDbDuplicateCheck]
  );

  // ----------------------------------------------------------------
  // Manual mapping confirm
  // ----------------------------------------------------------------
  const handleMappingConfirm = useCallback(
    (mappings: Record<string, string>) => {
      if (!pendingData) return;

      const hash = hashHeaders(pendingData.headers);
      const mappingArray = Object.entries(mappings).map(([fileHeader, targetField]) => ({
        fileHeader,
        targetField,
      }));
      saveTemplate(hash, mappingArray);

      const mappedHeaders = pendingData.headers.map(h => mappings[h] || h);
      setImportData(mappedHeaders, pendingData.rows, pendingData.totalRows);

      setShowMapping(false);
      setPendingData(null);
      toast.success(`映射关系已保存！共 ${pendingData.totalRows} 条数据已载入。`);
      runDbDuplicateCheck();
    },
    [pendingData, saveTemplate, setImportData, runDbDuplicateCheck]
  );

  // ----------------------------------------------------------------
  // Clear
  // ----------------------------------------------------------------
  const handleClear = useCallback(() => {
    if (confirm('确定要清除所有已载入的数据并重新上传吗？')) {
      clearImport();
      setSubmitResult(null);
    }
  }, [clearImport]);

  // ----------------------------------------------------------------
  // Export modified data
  // ----------------------------------------------------------------
  const handleExport = useCallback(() => {
    const dataToExport = rows.map(r => {
      const obj: Record<string, any> = {};
      headers.forEach(h => {
        obj[h] = r.data[h] ?? '';
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `导入数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`);
    toast.success('数据已成功导出为 Excel！');
  }, [rows, headers]);

  // ----------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (hasErrors) {
      toast.error(`当前有 ${errorCount} 处校验错误，请修复后再提交。`);
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(10);
    setSubmitResult(null);
    const loadingToast = toast.loading('正在同步至数据库...');

    try {
      const progressInterval = setInterval(() => {
        setSubmitProgress(prev => Math.min(prev + 12, 88));
      }, 300);

      const dataToSubmit = rows.map(r => r.data);
      const result = await submitImport(dataToSubmit);

      clearInterval(progressInterval);
      setSubmitProgress(100);

      if (result.success) {
        const { successCount = 0, failedCount = 0, failedRows } = result;
        setSubmitResult({ successCount, failedCount, failedRows });

        if (failedCount === 0) {
          toast.success(`提交完成！成功 ${successCount} 条。`, { id: loadingToast });
        } else {
          toast.warning(
            `提交完成：成功 ${successCount} 条，失败 ${failedCount} 条，请查看详情。`,
            { id: loadingToast, duration: 6000 }
          );
        }

        // Clear only successfully submitted rows; keep failed rows in view
        if (failedCount === 0) {
          setTimeout(() => {
            clearImport();
            setIsSubmitting(false);
            setSubmitProgress(0);
          }, 1200);
        } else {
          setIsSubmitting(false);
          setSubmitProgress(0);
        }
      } else {
        toast.error(`提交失败：${result.error}`, { id: loadingToast });
        setIsSubmitting(false);
        setSubmitProgress(0);
      }
    } catch {
      toast.error('同步过程中发生意外错误，请重试。', { id: loadingToast });
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  }, [hasErrors, errorCount, rows, clearImport]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="w-full flex flex-col space-y-6">
      <AnimatePresence mode="wait">
        {/* ── UPLOAD STAGE ── */}
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
          /* ── PREVIEW STAGE ── */
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col space-y-4"
          >
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={isSubmitting}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  返回重新上传
                </Button>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">数据预览</h2>
                  <Badge variant="outline">{rows.length} 条</Badge>
                  {hasErrors && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {errorCount} 处错误
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isSubmitting}>
                  <Download className="w-4 h-4 mr-1.5" />
                  导出 Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={isSubmitting}>
                  <Trash2 className="w-4 h-4 mr-1.5 text-destructive" />
                  清空数据
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={hasErrors || isSubmitting}
                  className="min-w-[120px]"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {isSubmitting ? '提交中...' : `提交 ${rows.length} 条`}
                </Button>
              </div>
            </div>

            {/* Submit progress */}
            {isSubmitting && (
              <div className="space-y-1.5">
                <Progress value={submitProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  正在同步至数据库... {submitProgress}%
                  （{Math.round(rows.length * submitProgress / 100)} / {rows.length} 条）
                </p>
              </div>
            )}

            {/* Submit result summary */}
            {submitResult && !isSubmitting && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-4 flex flex-col gap-2 ${
                  submitResult.failedCount === 0
                    ? 'bg-green-500/5 border-green-500/30'
                    : 'bg-yellow-500/5 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  提交结果汇总：成功 {submitResult.successCount} 条，失败 {submitResult.failedCount} 条
                </div>
                {submitResult.failedRows && submitResult.failedRows.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-6 list-disc">
                    {submitResult.failedRows.map((fr, i) => (
                      <li key={i}>
                        <span className="font-mono text-foreground">{fr.externalCode}</span>：{fr.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}

            {/* Main grid + error panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
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
