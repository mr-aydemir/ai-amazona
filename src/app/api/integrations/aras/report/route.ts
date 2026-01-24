import { NextRequest, NextResponse } from 'next/server';
import { getArasReport, ArasReportQuery } from '@/lib/aras-kargo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      queryType, 
      integrationCode, 
      date, 
      startDate, 
      endDate,
      trackingNumber,
      campaignCode,
      barcode,
      invoiceSerialNumber,
      reportType,
      dateType
    } = body;

    if (!queryType) {
        return NextResponse.json(
            { error: 'Missing required field: queryType' },
            { status: 400 }
        );
    }

    const query: ArasReportQuery = {
        QueryType: queryType,
        IntegrationCode: integrationCode,
        Date: date,
        StartDate: startDate,
        EndDate: endDate,
        TrackingNumber: trackingNumber,
        CampaignCode: campaignCode,
        Barcode: barcode,
        InvoiceSerialNumber: invoiceSerialNumber,
        ReportType: reportType,
        DateType: dateType
    };

    const result = await getArasReport(query);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, rawResponse: result.rawResponse },
        { status: 500 }
      );
    }

    return NextResponse.json(
        { 
            data: result.data,
            rawResponse: result.rawResponse // Optional, for debugging
        }, 
        { status: 200 }
    );

  } catch (error: any) {
    console.error('Error in Aras Kargo Report API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
