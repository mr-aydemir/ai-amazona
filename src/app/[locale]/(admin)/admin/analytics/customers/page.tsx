
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsMap } from '@/components/analytics/analytics-map';
import { AnalyticsDeviceChart } from '@/components/analytics/analytics-device-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function CustomerInsightsPage() {
  // Fetch all sessions
  const sessions = await prisma.analyticsSession.findMany({
    orderBy: { createdAt: 'desc' },
     // Limit to last 1000 for verify performance? Or just take all
    take: 1000
  });

  // Group by Country
  const sessionsByCountry: Record<string, number> = {};
  // Group by Device
  const sessionsByDevice: Record<string, number> = {};
  const sessionsByBrowser: Record<string, number> = {};
  const sessionsByOS: Record<string, number> = {};

  sessions.forEach(session => {
    // Country
    if (session.country) {
      const c = session.country;
      sessionsByCountry[c] = (sessionsByCountry[c] || 0) + 1;
    }
    
    // Device
    const d = session.device || 'desktop';
    sessionsByDevice[d] = (sessionsByDevice[d] || 0) + 1;

    // Browser
    if (session.browser) {
       sessionsByBrowser[session.browser] = (sessionsByBrowser[session.browser] || 0) + 1;
    }

    // OS
    if (session.os) {
       sessionsByOS[session.os] = (sessionsByOS[session.os] || 0) + 1;
    }
  });

  const mapData = Object.entries(sessionsByCountry).map(([code, value]) => ({
      code, value
  }));

  // Group by City
  const sessionsByCity: Record<string, {name: string, coordinates: [number, number], value: number }> = {};
  sessions.forEach(session => {
      if (session.city && session.latitude && session.longitude) {
          const key = `${session.city}-${session.latitude}-${session.longitude}`;
          if (!sessionsByCity[key]) {
              sessionsByCity[key] = {
                  name: session.city,
                  coordinates: [session.longitude, session.latitude], // GeoJSON order: [lon, lat]
                  value: 0
              };
          }
          sessionsByCity[key].value += 1;
      }
  });

  const cityData = Object.values(sessionsByCity);

  const deviceData = Object.entries(sessionsByDevice).map(([name, value]) => ({ name, value }));
  const browserData = Object.entries(sessionsByBrowser).map(([name, value]) => ({ name, value }));
  const osData = Object.entries(sessionsByOS).map(([name, value]) => ({ name, value }));

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
                <AnalyticsMap data={mapData} cityData={cityData} />
            </CardContent>
        </Card>

        {/* Device Stats */}
        <Card>
            <CardHeader>
                <CardTitle>Device Type</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={deviceData} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Browser</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={browserData} />
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Operating System</CardTitle>
            </CardHeader>
            <CardContent>
                <AnalyticsDeviceChart data={osData} />
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
                    {sessions.slice(0, 10).map(s => (
                        <TableRow key={s.id}>
                            <TableCell>{s.createdAt.toLocaleTimeString()}</TableCell>
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