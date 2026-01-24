import { NextRequest, NextResponse } from 'next/server';
import { createArasOrder, ArasOrderInfo } from '@/lib/aras-kargo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic validation could go here.
    // Ensure critical fields are present.
    if (!body.TradingWaybillNumber || !body.ReceiverName || !body.ReceiverAddress || !body.IntegrationCode) {
      return NextResponse.json(
        { error: 'Missing required fields: TradingWaybillNumber, ReceiverName, ReceiverAddress, IntegrationCode' },
        { status: 400 }
      );
    }

    // Map the body to ArasOrderInfo.
    // The frontend should send a payload matching the structure we expect, 
    // or we transform it here. For now, assuming direct mapping for simplicity/flexibility.
    const orderInfo: ArasOrderInfo = {
       IntegrationCode: body.IntegrationCode,
       TradingWaybillNumber: body.TradingWaybillNumber,
       InvoiceNumber: body.InvoiceNumber,
       ReceiverName: body.ReceiverName,
       ReceiverAddress: body.ReceiverAddress,
       ReceiverPhone1: body.ReceiverPhone1,
       ReceiverPhone2: body.ReceiverPhone2,
       ReceiverPhone3: body.ReceiverPhone3,
       ReceiverCityName: body.ReceiverCityName,
       ReceiverTownName: body.ReceiverTownName,
       PieceCount: body.PieceCount,
       SpecialField1: body.SpecialField1,
       SpecialField2: body.SpecialField2,
       SpecialField3: body.SpecialField3,
       IsCod: body.IsCod,
       CodAmount: body.CodAmount,
       CodCollectionType: body.CodCollectionType,
       CodBillingType: '0', // Always 0 per doc
       Description: body.Description,
       TaxNumber: body.TaxNumber,
       TaxOffice: body.TaxOffice,
       PrivilegeOrder: body.PrivilegeOrder,
       CityCode: body.CityCode,
       TownCode: body.TownCode,
       ReceiverDistrictName: body.ReceiverDistrictName,
       ReceiverQuarterName: body.ReceiverQuarterName,
       ReceiverAvenueName: body.ReceiverAvenueName,
       ReceiverStreetName: body.ReceiverStreetName,
       PayorTypeCode: body.PayorTypeCode || '1', // Default to Sender (1)
       IsWorldWide: body.IsWorldWide || '0', // Default to Domestic (0)
       PieceDetails: body.PieceDetails
    };

    const result = await createArasOrder(orderInfo);

    if (result.resultCode === '0') {
      return NextResponse.json({ success: true, ...result });
    } else {
      return NextResponse.json({ success: false, ...result }, { status: 400 });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
