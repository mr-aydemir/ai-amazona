
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalyticsChart } from '@/components/analytics/analytics-chart'; // We will create this client component for Recharts

// Use server component for data fetching
export default async function AnalyticsPage() {
  // 1. Daily Sessions (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await prisma.analyticsSession.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, visitorId: true },
    orderBy: { createdAt: 'asc' }
  });

  // Group by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.createdAt.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(sessionsByDate).map(date => ({
    date,
    visits: sessionsByDate[date]
  }));

  // 2. Top Pages
  const topPages = await prisma.analyticsPageView.groupBy({
    by: ['path'],
    _count: { path: true },
    orderBy: { _count: { path: 'desc' } },
    take: 10,
  });

  // 3. Top Products
  // Since we store productId in analyticsPageView, we can group by it.
  // Note: productId might be null.
  const topProductsRaw = await prisma.analyticsPageView.groupBy({
    by: ['productId'],
    _count: { productId: true },
    where: { productId: { not: null } },
    orderBy: { _count: { productId: 'desc' } },
    take: 10,
  });

  // Fetch product names for these IDs
  const productIds = topProductsRaw.map(p => p.productId!).filter(Boolean);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true } // Assuming 'name' exists on Product
  });

  const topProducts = topProductsRaw.map(p => {
    const product = products.find(prod => prod.id === p.productId);
    return {
      name: product?.name || 'Unknown Product',
      id: p.productId,
      count: p._count.productId
    };
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visitors (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={chartData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Viewed Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map((page) => (
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
            <CardTitle>Top Viewed Products</CardTitle>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell>{prod.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{prod.id}</TableCell>
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
