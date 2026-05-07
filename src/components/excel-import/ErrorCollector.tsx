
'use client';

import React from 'react';
import { useImportStore } from '@/store/useImportStore';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ErrorCollector() {
  const { errorMap } = useImportStore();
  
  const allErrors = Object.values(errorMap).flat();
  const totalErrors = allErrors.length;

  if (totalErrors === 0) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6 flex items-center gap-3">
          <Info className="text-green-500 w-5 h-5" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            No validation errors found. Data is ready for import.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Validation Errors
        </CardTitle>
        <Badge variant="destructive">{totalErrors}</Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px] w-full p-4">
          <div className="space-y-3">
            {Object.entries(errorMap).map(([rowId, errors]) => (
              <div key={rowId} className="border-l-2 border-destructive pl-3 py-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Row {errors[0].row}
                </p>
                {errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <span className="font-medium">{error.field}:</span>
                    <span className="text-muted-foreground">{error.msg}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
