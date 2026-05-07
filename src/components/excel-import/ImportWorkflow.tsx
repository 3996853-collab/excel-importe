
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
      toast.success('Recognized template applied!');
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
    toast.success('Template saved and applied!');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data?')) {
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
    toast.success('File exported successfully!');
  };

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error('Please fix all validation errors before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitProgress(10);
    const loadingToast = toast.loading('Initiating sync...');
    
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
        toast.success(`Successfully imported ${rows.length} records!`, { id: loadingToast });
        setTimeout(() => {
            clearImport();
            setIsSubmitting(false);
            setSubmitProgress(0);
        }, 500);
      } else {
        toast.error(`Import failed: ${result.error}`, { id: loadingToast });
        setIsSubmitting(false);
        setSubmitProgress(0);
      }
    } catch (error) {
      toast.error('An unexpected error occurred during import.', { id: loadingToast });
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
                  Upload Different File
                </Button>
                <h2 className="text-2xl font-bold tracking-tight">Data Preview</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isSubmitting}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Modified
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={isSubmitting}>
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  Clear Data
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={hasErrors || isSubmitting}>
                  <Database className="w-4 h-4 mr-2" />
                  Submit {rows.length} Records
                </Button>
              </div>
            </div>

            {isSubmitting && (
              <div className="space-y-2">
                <Progress value={submitProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">Uploading data... {submitProgress}%</p>
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
