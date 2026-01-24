import { NextRequest, NextResponse } from 'next/server';
import { cancelArasDispatch } from '@/lib/aras-kargo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const integrationCode = body.integrationCode;

    if (!integrationCode) {
        return NextResponse.json(
        { error: 'Missing integrationCode in body.' },
        { status: 400 }
        );
    }

    const result = await cancelArasDispatch(integrationCode);
    
    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json(
             { error: result.message, raw: result.rawResponse }, 
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
