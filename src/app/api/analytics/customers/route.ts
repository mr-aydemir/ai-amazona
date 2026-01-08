
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all sessions
    const sessions = await prisma.analyticsSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    // Group by Country
    const sessionsByCountry: Record<string, number> = {};
    const sessionsByDevice: Record<string, number> = {};
    const sessionsByBrowser: Record<string, number> = {};
    const sessionsByOS: Record<string, number> = {};
    
    // Group by City
    const sessionsByCity: Record<string, {name: string, coordinates: [number, number], value: number }> = {};

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

      // City
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

    const mapData = Object.entries(sessionsByCountry).map(([code, value]) => ({
        code, value
    }));

    const cityData = Object.values(sessionsByCity);
    const deviceData = Object.entries(sessionsByDevice).map(([name, value]) => ({ name, value }));
    const browserData = Object.entries(sessionsByBrowser).map(([name, value]) => ({ name, value }));
    const osData = Object.entries(sessionsByOS).map(([name, value]) => ({ name, value }));

    return NextResponse.json({
        mapData,
        cityData,
        deviceData,
        browserData,
        osData,
        recentSessions: sessions.slice(0, 10)
    });

  } catch (error) {
    console.error('Error fetching analytics customers:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
