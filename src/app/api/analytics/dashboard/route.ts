
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
      select: { id: true, name: true, slug: true }
    });
  
    const topProducts = topProductsRaw.map(p => {
      const product = products.find(prod => prod.id === p.productId);
      return {
        name: product?.name || 'Unknown Product',
        id: p.productId,
        count: p._count.productId
      };
    });

    return NextResponse.json({
        chartData,
        topPages,
        topProducts
    });

  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
