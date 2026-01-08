
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import { useTranslations } from 'next-intl';

interface DashboardData {
    chartData: { date: string; visits: number }[];
    topPages: { path: string; _count: { path: number } }[];
    topProducts: { name: string; id: string | null; count: number }[];
}

export default function AnalyticsPage() {
  const t = useTranslations('admin.analytics.dashboard');
  const tCommon = useTranslations('admin.analytics.common');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/analytics/dashboard');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
      return <div className="p-6">{t('loading')}</div>;
  }

  if (!data) {
      return <div className="p-6">{tCommon('load_error')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('visitors_7_days')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={data.chartData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('top_pages')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('path')}</TableHead>
                    <TableHead className="text-right">{t('views')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell className="font-medium truncate max-w-[200px]" title={page.path}>
                        {page.path}
                      </TableCell>
                      <TableCell className="text-right">{page._count.path}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>{t('top_viewed_products')}</CardTitle>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product_name')}</TableHead>
                    <TableHead>{t('product_id')}</TableHead>
                    <TableHead className="text-right">{t('views')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((prod) => (
                    <TableRow key={prod.id || 'unknown'}>
                      <TableCell>{prod.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{prod.id || '-'}</TableCell>
                      <TableCell className="text-right">{prod.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
        </CardContent>
      </Card>
    </div>
  );
}
