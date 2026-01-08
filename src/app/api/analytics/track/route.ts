
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { UAParser } from 'ua-parser-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, url, referrer, userAgent, width, height, productId, duration } = body;
    const cookieStore = await cookies();
    let visitorId = cookieStore.get('visitor_id')?.value;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    // Determine session
    // We assume a session lasts for 30 mins of inactivity or similar.
    // For simplicity, we look for the most recent session for this visitor.
    let session = await prisma.analyticsSession.findFirst({
      where: { visitorId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session || (new Date().getTime() - session.updatedAt.getTime() > 30 * 60 * 1000)) {
       // Create new session if none exists or last one is stale
       if (event !== 'HEARTBEAT') { // Don't start session on heartbeat
         // Parse IP
         const forwardedFor = req.headers.get('x-forwarded-for');
         const finalIp = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';
         
         // Parse UA
         const parser = new UAParser(userAgent);
         const browserName = parser.getBrowser().name;
         const osName = parser.getOS().name;
         const deviceType = parser.getDevice().type || (width < 768 ? 'mobile' : 'desktop');

         // Parse Location
         let country, city;
         try {
           // Dynamic import to avoid build/runtime issues with file access
           const geoip = (await import('geoip-lite')).default; 
           const geo = geoip.lookup(finalIp);
           country = geo?.country;
           city = geo?.city;
         } catch (error) {
           console.error('GeoIP lookup failed:', error);
         }

         session = await prisma.analyticsSession.create({
           data: {
             visitorId,
             userAgent,
             referrer,
             ipAddress: finalIp,
             country,
             city,
             device: deviceType, 
             browser: browserName,
             os: osName,
           },
         });
       }
    }

    if (!session) {
        // Should not happen unless heartbeat sends without session start, but just in case return
        return NextResponse.json({ visitorId }, { status: 200 });
    }
    
    // Update session timestamp
    await prisma.analyticsSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() }
    });


    if (event === 'PAGE_VIEW') {
      let finalProductId = productId;
      
      // Try to resolve product from URL if not provided
      if (!finalProductId && url) {
          // Assume URL format: /.../product/[slug] or /product/[slug]
          // Regex to capture slug after /product/
          // Regex to capture slug after /product/ or /products/
          const match = url.match(/\/products?\/([^\/]+)/);
          if (match && match[1]) {
              const slug = match[1];
              // decodeURIComponent in case of special chars
              const decodedSlug = decodeURIComponent(slug);
              
              const product = await prisma.product.findUnique({
                  where: { slug: decodedSlug },
                  select: { id: true }
              });
              
              if (product) {
                  finalProductId = product.id;
              } else {
                  console.log('Analytics: Product not found for slug:', decodedSlug);
              }
          }
      }

      await prisma.analyticsPageView.create({
        data: {
          sessionId: session.id,
          path: url,
          title: body.title,
          productId: finalProductId || null,
        },
      });
    } else if (event === 'HEARTBEAT') {
      // Find the last page view for this session and update duration
       const lastView = await prisma.analyticsPageView.findFirst({
         where: { sessionId: session.id },
         orderBy: { createdAt: 'desc' },
       });
       
       if (lastView) {
           // We add the heartbeat duration (e.g. 5s) to the total
           // Or we update duration based on time difference?
           // Simpler: Client sends cumulative duration or we just increment.
           // Let's assume client sends "seconds since last heartbeat" e.g. 5.
           // Or client sends total duration on page.
           // Let's increment by 5s (assumed interval).
           await prisma.analyticsPageView.update({
               where: { id: lastView.id },
               data: { duration: { increment: 5 } }
           });
       }
    }

    const response = NextResponse.json({ success: true, visitorId });
    // Set cookie if needed
    if (!cookieStore.get('visitor_id')) {
        response.cookies.set('visitor_id', visitorId, { httpOnly: true, maxAge: 60 * 60 * 24 * 365 }); 
    }
    return response;

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
