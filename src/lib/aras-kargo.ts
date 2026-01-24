import { XMLParser } from 'fast-xml-parser';

export interface ArasPieceDetail {
  VolumetricWeight?: string;
  Weight?: string;
  BarcodeNumber: string;
  ProductNumber?: string;
  Description?: string;
}

export interface ArasOrderInfo {
  IntegrationCode: string;
  TradingWaybillNumber: string;
  InvoiceNumber?: string;
  ReceiverName: string;
  ReceiverAddress: string;
  ReceiverPhone1: string;
  ReceiverPhone2?: string;
  ReceiverPhone3?: string;
  ReceiverCityName: string;
  ReceiverTownName: string;
  PieceCount?: string; // If PieceDetails is provided, this is calculated or passed? Doc says "Illetiliyorsa Zorunlu"
  SpecialField1?: string;
  SpecialField2?: string;
  SpecialField3?: string;
  IsCod?: '0' | '1';
  CodAmount?: string;
  CodCollectionType?: '0' | '1';
  CodBillingType?: '0'; // Fixed to 0
  Description?: string;
  TaxNumber?: string;
  TaxOffice?: string;
  PrivilegeOrder?: string;
  CityCode?: string; // Optional code
  TownCode?: string; // Optional code
  ReceiverDistrictName?: string;
  ReceiverQuarterName?: string;
  ReceiverAvenueName?: string;
  ReceiverStreetName?: string;
  PayorTypeCode: '1' | '2'; // 1=Sender, 2=Receiver
  IsWorldWide: '0' | '1'; // 0=Domestic, 1=International
  PieceDetails?: ArasPieceDetail[];
}

export interface ArasResponse {
  resultCode: string;
  resultMessage: string;
  rawResponse: any;
}

const ARAS_API_URL_TEST = 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';
const ARAS_API_URL_PROD = 'https://customerws.araskargo.com.tr/arascargoservice.asmx';

export const createArasOrder = async (orderInfo: ArasOrderInfo): Promise<ArasResponse> => {
  const username = process.env.ARAS_KARGO_USERNAME;
  const password = process.env.ARAS_KARGO_PASSWORD;
  // Default to test URL if not set, or specific prod flag
  const apiUrl = process.env.ARAS_KARGO_API_URL || ARAS_API_URL_TEST;

  if (!username || !password) {
    throw new Error('ARAS_KARGO_USERNAME and ARAS_KARGO_PASSWORD must be defined in environment variables.');
  }

  // Construct PieceDetails XML
  let pieceDetailsXml = '';
  if (orderInfo.PieceDetails && orderInfo.PieceDetails.length > 0) {
    pieceDetailsXml = `<PieceDetails>
      ${orderInfo.PieceDetails.map(detail => `
        <PieceDetail>
          <VolumetricWeight>${detail.VolumetricWeight || ''}</VolumetricWeight>
          <Weight>${detail.Weight || ''}</Weight>
          <BarcodeNumber>${detail.BarcodeNumber}</BarcodeNumber>
          <ProductNumber>${detail.ProductNumber || ''}</ProductNumber>
          <Description>${detail.Description || ''}</Description>
        </PieceDetail>
      `).join('')}
    </PieceDetails>`;
  }

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <orderInfo>
        <Order>
          <UserName>${username}</UserName>
          <Password>${password}</Password>
          <TradingWaybillNumber>${orderInfo.TradingWaybillNumber}</TradingWaybillNumber>
          <InvoiceNumber>${orderInfo.InvoiceNumber || ''}</InvoiceNumber>
          <ReceiverName>${escapeXml(orderInfo.ReceiverName)}</ReceiverName>
          <ReceiverAddress>${escapeXml(orderInfo.ReceiverAddress)}</ReceiverAddress>
          <ReceiverPhone1>${orderInfo.ReceiverPhone1}</ReceiverPhone1>
          <ReceiverPhone2>${orderInfo.ReceiverPhone2 || ''}</ReceiverPhone2>
          <ReceiverPhone3>${orderInfo.ReceiverPhone3 || ''}</ReceiverPhone3>
          <ReceiverCityName>${escapeXml(orderInfo.ReceiverCityName)}</ReceiverCityName>
          <ReceiverTownName>${escapeXml(orderInfo.ReceiverTownName)}</ReceiverTownName>
          <VolumetricWeight>1</VolumetricWeight> 
          <Weight>1</Weight>
          <PieceCount>${orderInfo.PieceCount || (orderInfo.PieceDetails ? orderInfo.PieceDetails.length : 1)}</PieceCount>
          <IntegrationCode>${orderInfo.IntegrationCode}</IntegrationCode>
          <SpecialField1>${orderInfo.SpecialField1 || ''}</SpecialField1>
          <SpecialField2>${orderInfo.SpecialField2 || ''}</SpecialField2>
          <SpecialField3>${orderInfo.SpecialField3 || ''}</SpecialField3>
          <IsCod>${orderInfo.IsCod || '0'}</IsCod>
          <CodAmount>${orderInfo.CodAmount || (orderInfo.IsCod === '1' && orderInfo.CodAmount ? orderInfo.CodAmount : '0')}</CodAmount>
          <CodCollectionType>${orderInfo.CodCollectionType || ''}</CodCollectionType>
          <CodBillingType>${orderInfo.CodBillingType || '0'}</CodBillingType>
          <Description>${escapeXml(orderInfo.Description || '')}</Description>
          <TaxNumber>${orderInfo.TaxNumber || ''}</TaxNumber>
          <TaxOffice>${orderInfo.TaxOffice || ''}</TaxOffice>
          <CityCode>${orderInfo.CityCode || ''}</CityCode>
          <TownCode>${orderInfo.TownCode || ''}</TownCode>
          <ReceiverDistrictName>${escapeXml(orderInfo.ReceiverDistrictName || '')}</ReceiverDistrictName>
          <ReceiverQuarterName>${escapeXml(orderInfo.ReceiverQuarterName || '')}</ReceiverQuarterName>
          <ReceiverAvenueName>${escapeXml(orderInfo.ReceiverAvenueName || '')}</ReceiverAvenueName>
          <ReceiverStreetName>${escapeXml(orderInfo.ReceiverStreetName || '')}</ReceiverStreetName>
          <PayorTypeCode>${orderInfo.PayorTypeCode}</PayorTypeCode>
          <IsWorldWide>${orderInfo.IsWorldWide}</IsWorldWide>
          ${pieceDetailsXml}
        </Order>
      </orderInfo>
      <userName>${username}</userName>
      <password>${password}</password>
    </SetOrder>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      body: soapBody,
    });

    const textResponse = await response.text();
    
    // Let's use a regex to extract ResultCode and ResultMessage as it is safer than adding a lib without asking.
    const resultCodeMatch = textResponse.match(/<ResultCode>(.*?)<\/ResultCode>/);
    const resultMessageMatch = textResponse.match(/<ResultMessage>(.*?)<\/ResultMessage>/);

    const resultCode = resultCodeMatch ? resultCodeMatch[1] : '-1';
    const resultMessage = resultMessageMatch ? resultMessageMatch[1] : 'Unknown Error parsing response';

    return {
      resultCode,
      resultMessage,
      rawResponse: textResponse
    };

  } catch (error: any) {
    console.error('Aras Kargo API Error:', error);
    return {
      resultCode: '5000', // Internal error code
      resultMessage: error.message || 'Internal Server Error',
      rawResponse: null
    };
  }
};

export const getArasOrderByIntegrationCode = async (integrationCode: string) => {
  const username = process.env.ARAS_KARGO_USERNAME;
  const password = process.env.ARAS_KARGO_PASSWORD;
  let apiUrl = process.env.ARAS_KARGO_API_URL || ARAS_API_URL_TEST;

  if (!username || !password) {
    throw new Error('ARAS_KARGO_USERNAME and ARAS_KARGO_PASSWORD must be defined in environment variables.');
  }

  // The documentation shows appending /GetOrderWithIntegrationCode to the base ASMX URL if accessing via path
  // but usually ASMX services expose methods via ?op=MethodName or /MethodName
  // The provided doc example: GET /arascargoservice/arascargoservice.asmx/GetOrderWithIntegrationCode
  // So we need to append /GetOrderWithIntegrationCode to the base URL (removing .asmx if it's not part of the base, but likely base is .asmx)
  
  // ARAS_API_URL_TEST is .../arascargoservice.asmx
  // So we append /GetOrderWithIntegrationCode to it.
  
  const endpoint = `${apiUrl}/GetOrderWithIntegrationCode`;
  
  // Using POST with application/x-www-form-urlencoded as per the example
  const params = new URLSearchParams();
  params.append('userName', username);
  params.append('password', password);
  params.append('integrationCode', integrationCode);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const textResponse = await response.text();

    // Check for 200 OK
    if (!response.ok) {
       return {
         success: false,
         message: `HTTP Error: ${response.status}`,
         rawResponse: textResponse
       }
    }

    // Response is XML <ArrayOfOrder>...</ArrayOfOrder>
    // We can use regex to check if we got Order elements.
    // Ideally we would parse this into a JS object.
    // Basic regex check for now.
    
    return {
        success: true,
        rawResponse: textResponse
    }

  } catch (error: any) {
    console.error('Aras Kargo API Error:', error);
    return {
      success: false,
      message: error.message,
      rawResponse: null
    };
  }
}

export const getArasOrdersByDate = async (date: string) => {
  const username = process.env.ARAS_KARGO_USERNAME;
  const password = process.env.ARAS_KARGO_PASSWORD;
  let apiUrl = process.env.ARAS_KARGO_API_URL || ARAS_API_URL_TEST;

  if (!username || !password) {
    throw new Error('ARAS_KARGO_USERNAME and ARAS_KARGO_PASSWORD must be defined in environment variables.');
  }

  // Endpoint for GetOrder
  const endpoint = `${apiUrl}/GetOrder`;
  
  const params = new URLSearchParams();
  params.append('userName', username);
  params.append('password', password);
  params.append('Date', date);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const textResponse = await response.text();

    if (!response.ok) {
       return {
         success: false,
         message: `HTTP Error: ${response.status}`,
         rawResponse: textResponse
       }
    }
    
    return {
        success: true,
        rawResponse: textResponse
    }

  } catch (error: any) {
    console.error('Aras Kargo API Error:', error);
    return {
      success: false,
      message: error.message,
      rawResponse: null
    };
  }
}

export const cancelArasDispatch = async (integrationCode: string) => {
  const username = process.env.ARAS_KARGO_USERNAME;
  const password = process.env.ARAS_KARGO_PASSWORD;
  let apiUrl = process.env.ARAS_KARGO_API_URL || ARAS_API_URL_TEST;

  if (!username || !password) {
    throw new Error('ARAS_KARGO_USERNAME and ARAS_KARGO_PASSWORD must be defined in environment variables.');
  }

  // Endpoint for CancelDispatch
  // Use POST method as per doc
  const endpoint = `${apiUrl}/CancelDispatch`;
  
  const params = new URLSearchParams();
  params.append('userName', username);
  params.append('password', password);
  params.append('integrationCode', integrationCode);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const textResponse = await response.text();
    
    // Parse response for ResultCode and ResultMessage
    const resultCodeMatch = textResponse.match(/<ResultCode>(.*?)<\/ResultCode>/);
    const resultMessageMatch = textResponse.match(/<ResultMessage>(.*?)<\/ResultMessage>/);

    const resultCode = resultCodeMatch ? resultCodeMatch[1] : '-1';
    const resultMessage = resultMessageMatch ? resultMessageMatch[1] : 'Unknown Error parsing response';

    if (!response.ok) {
       return {
         success: false,
         resultCode: resultCode,
         message: `HTTP Error: ${response.status} - ${resultMessage}`,
         rawResponse: textResponse
       }
    }
    
    return {
        success: resultCode === '0', // 0 is success code
        resultCode,
        message: resultMessage,
        rawResponse: textResponse
    }

  } catch (error: any) {
    console.error('Aras Kargo API Error:', error);
    return {
      success: false,
      message: error.message,
      rawResponse: null
    };
  }
}

// Reporting Service Constants
const ARAS_REPORT_API_URL_TEST = 'https://customerservicestest.araskargo.com.tr/ArasCargoIntegrationService.svc';
const ARAS_REPORT_API_URL_PROD = 'https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc';

export interface ArasReportQuery {
  QueryType: number;
  IntegrationCode?: string;
  Date?: string;
  StartDate?: string;
  EndDate?: string;
  TrackingNumber?: string;
  CampaignCode?: string;
  Barcode?: string;
  InvoiceSerialNumber?: string;
  ReportType?: '1' | '2'; // 1=E-Invoice, 2=Normal
  DateType?: '1' | '2' | '3';
}

export const getArasReport = async (query: ArasReportQuery) => {
  const username = process.env.ARAS_KARGO_USERNAME;
  const password = process.env.ARAS_KARGO_PASSWORD;
  const customerCode = process.env.ARAS_KARGO_CUSTOMER_CODE || '1932448851342'; // Default from doc or env
  const apiUrl = process.env.ARAS_KARGO_REPORT_API_URL || ARAS_REPORT_API_URL_TEST;

  if (!username || !password) {
    throw new Error('ARAS_KARGO_USERNAME and ARAS_KARGO_PASSWORD must be defined in environment variables.');
  }

  // Construct QueryInfo XML
  let queryInfoXml = `<QueryInfo>
    <QueryType>${query.QueryType}</QueryType>`;
  
  if (query.IntegrationCode) queryInfoXml += `<IntegrationCode>${query.IntegrationCode}</IntegrationCode>`;
  if (query.Date) queryInfoXml += `<Date>${query.Date}</Date>`;
  if (query.StartDate) queryInfoXml += `<StartDate>${query.StartDate}</StartDate>`;
  if (query.EndDate) queryInfoXml += `<EndDate>${query.EndDate}</EndDate>`;
  if (query.TrackingNumber) queryInfoXml += `<TrackingNumber>${query.TrackingNumber}</TrackingNumber>`;
  if (query.CampaignCode) queryInfoXml += `<CampaignCode>${query.CampaignCode}</CampaignCode>`;
  if (query.Barcode) queryInfoXml += `<Barcode>${query.Barcode}</Barcode>`;
  if (query.InvoiceSerialNumber) queryInfoXml += `<InvoiceSerialNumber>${query.InvoiceSerialNumber}</InvoiceSerialNumber>`;
  if (query.ReportType) queryInfoXml += `<ReportType>${query.ReportType}</ReportType>`;
  if (query.DateType) queryInfoXml += `<DateType>${query.DateType}</DateType>`;
  
  queryInfoXml += `</QueryInfo>`;

  const loginInfoXml = `<LoginInfo>
    <UserName>${username}</UserName>
    <Password>${password}</Password>
    <CustomerCode>${customerCode}</CustomerCode>
  </LoginInfo>`;

  // SOAP Body construction
  const soapBody = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Body>
        <GetQueryJSON xmlns="http://tempuri.org/">
            <loginInfo>${escapeXml(loginInfoXml)}</loginInfo>
            <queryInfo>${escapeXml(queryInfoXml)}</queryInfo>
        </GetQueryJSON>
    </s:Body>
</s:Envelope>`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://tempuri.org/IArasCargoIntegrationService/GetQueryJSON'
      },
      body: soapBody,
    });

    const textResponse = await response.text();

    if (!response.ok) {
       return {
         success: false,
         message: `HTTP Error: ${response.status}`,
         rawResponse: textResponse
       }
    }

    // Extract JSON result
    // Response likely: <GetQueryJSONResult>...json string...</GetQueryJSONResult>
    const match = textResponse.match(/<GetQueryJSONResult>(.*?)<\/GetQueryJSONResult>/);
    const jsonString = match ? match[1] : '';

    const unescapedJsonString = unescapeXml(jsonString);

    let parsedData = null;
    try {
        if (unescapedJsonString) {
             parsedData = JSON.parse(unescapedJsonString);
        }
    } catch (e) {
        console.error('Failed to parse JSON from response', e);
    }

    return {
        success: true,
        data: parsedData,
        rawResponse: textResponse
    }

  } catch (error: any) {
    console.error('Aras Kargo Report API Error:', error);
    return {
      success: false,
      message: error.message,
      rawResponse: null
    };
  }
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function unescapeXml(str: string): string {
    if (!str) return '';
    return str.replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
}
