
'use client';

import React, { useEffect, useState } from 'react';
import { fetchHistory } from '@/app/actions/import-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [externalCode, setExternalCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchHistory({ 
        page, 
        search, 
        externalCode,
        startDate,
        endDate
      });
      setData(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">已导入运单</h1>
        <Badge variant="outline" className="text-sm">
          共 {pagination.total || 0} 条记录
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            筛选与搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索收件人姓名..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="按外部编码筛选..." 
                className="pl-9"
                value={externalCode}
                onChange={(e) => setExternalCode(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="date"
                className="pl-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="date"
                className="pl-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button type="submit">搜索</Button>
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setSearch(''); 
                  setExternalCode(''); 
                  setStartDate('');
                  setEndDate('');
                  setPage(1); 
                  loadData(); 
                }}
            >
                重置
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>外部编码</TableHead>
              <TableHead>收件人</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>重量</TableHead>
              <TableHead>件数</TableHead>
              <TableHead>温层</TableHead>
              <TableHead>导入时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在加载数据...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  暂无运单记录
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.externalCode}</TableCell>
                  <TableCell className="font-medium">{row.receiverName}</TableCell>
                  <TableCell>{row.receiverPhone}</TableCell>
                  <TableCell>{row.weight} kg</TableCell>
                  <TableCell>{row.quantity} 件</TableCell>
                  <TableCell>{row.temperature}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          第 {pagination.page} 页，共 {pagination.totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一页
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
