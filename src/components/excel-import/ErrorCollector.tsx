
'use client';

import React from 'react';
import { useImportStore } from '@/store/useImportStore';
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFieldLabel } from '@/lib/field-labels';

export function ErrorCollector() {
  const { errorMap, rows } = useImportStore();

  const allErrors = Object.values(errorMap).flat();
  const totalErrors = allErrors.length;

  if (totalErrors === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 flex items-center gap-3">
          <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            未发现校验错误，数据可以提交。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          校验错误列表
        </CardTitle>
        <Badge variant="destructive">{totalErrors} 处错误</Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[500px] w-full px-4 pb-4">
          <div className="space-y-3 pt-2">
            {Object.entries(errorMap).map(([rowId, errors]) => (
              <div key={rowId} className="border-l-2 border-destructive/60 pl-3 py-1 bg-destructive/5 rounded-r-md">
                <p className="text-xs font-semibold text-destructive mb-1.5">
                  第 {errors[0].row} 行
                </p>
                {errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs mb-1">
                    <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">{getFieldLabel(error.field)}</span>
                      <span className="text-muted-foreground">：{error.msg}</span>
                    </span>
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
