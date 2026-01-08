
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsMap } from '@/components/analytics/analytics-map';
import { AnalyticsDeviceChart } from '@/components/analytics/analytics-device-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Session {
    id: string;
    createdAt: string;
    city: string | null;
    country: string | null;
    device: string | null;
    os: string | null;
    browser: string | null;
    ipAddress: string | null;
}

interface AnalyticsData {
    mapData: { code: string; value: number }[];
    cityData: { name: string; coordinates: [number, number]; value: number }[];
    deviceData: { name: string; value: number }[];
    browserData: { name: string; value: number }[];
    osData: { name: string; value: number }[];
    recentSessions: Session[];
}

export default function CustomerInsightsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/analytics/customers');
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
      return <div className="p-6">Loading analytics data...</div>;
  }

  if (!data) {
      return <div className="p-6">Failed to load data.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Customer Insights</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Section */}
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Global Visitor Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsMap data={data.mapData} cityData={data.cityData} />
            </CardContent>
        </Card>

        {/* Device Stats */}
        <Card>
            <CardHeader>
                <CardTitle>Device Type</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={data.deviceData} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Browser</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={data.browserData} />
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Operating System</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={data.osData} />
            </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card>
          <CardHeader>
               <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>OS / Browser</TableHead>
                        <TableHead>IP</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.recentSessions.map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{new Date(s.createdAt).toLocaleTimeString()}</TableCell>
                            <TableCell>{s.city ? `${s.city}, ${s.country}` : s.country || '-'}</TableCell>
                            <TableCell className="capitalize">{s.device}</TableCell>
                            <TableCell>{s.os} / {s.browser}</TableCell>
                            <TableCell className="font-mono text-xs">{s.ipAddress}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}