import { NextRequest, NextResponse } from 'next/server';
import { getArasOrderByIntegrationCode, getArasOrdersByDate } from '@/lib/aras-kargo';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const integrationCode = searchParams.get('integrationCode');
  const date = searchParams.get('date');

  if (!integrationCode && !date) {
    return NextResponse.json(
      { error: 'Missing query parameter. Provide either "integrationCode" or "date".' },
      { status: 400 }
    );
  }

  try {
    let result;
    if (integrationCode) {
        result = await getArasOrderByIntegrationCode(integrationCode);
    } else if (date) {
        result = await getArasOrdersByDate(date);
    }

    if (result && result.success) {
        // Return raw XML for now as frontend can parse or we can process it later
        // or return as text/xml content-type if user prefers
        return new NextResponse(result.rawResponse, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml'
            }
        });
    } else {
        return NextResponse.json(
             { error: result?.message || 'Unknown error', raw: result?.rawResponse }, 
             { status: 500 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
