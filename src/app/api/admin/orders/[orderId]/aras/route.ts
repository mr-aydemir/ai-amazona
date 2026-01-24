
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { createArasOrder, ArasOrderInfo } from '@/lib/aras-kargo'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // 1. Fetch Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 2. Validate Address
    if (!order.shippingCity || !order.shippingStreet) {
       return NextResponse.json({ error: 'Shipping address is incomplete (City and Street required)' }, { status: 400 })
    }

    // 3. Construct ArasOrderInfo
    // Aras requires City and Town. We map shippingCity -> City, shippingState -> Town.
    // Fallback: If town (shippingState) is missing, repeat City or use a dash. Aras might reject if Town is invalid.
    // Ideally we should have a proper City/Town selector in checkout.
    const receiverCity = order.shippingCity
    const receiverTown = order.shippingState || order.shippingCity // Fallback to city if state is empty, though Aras expects a district.

    const arasOrderInfo: ArasOrderInfo = {
      IntegrationCode: order.id.toUpperCase(),
      TradingWaybillNumber: order.id.slice(-16).toUpperCase(), // Max 16 chars
      ReceiverName: order.shippingFullName || order.user.name || 'Alıcı',
      ReceiverAddress: order.shippingStreet,
      ReceiverPhone1: order.shippingPhone || order.user.phone || '05555555555', // Fallback for dev, but validation should catch this
      ReceiverCityName: receiverCity,
      ReceiverTownName: receiverTown,
      PieceCount: '1', // Default 1 piece for simplicity, or we could calculate
      PayorTypeCode: '1', // 1=Sender (Gonderici Odemeli), 2=Receiver (Alici Odemeli). Defaulting to Sender as merchant usually pays.
      IsWorldWide: '0', // Domestic
      Description: `Sipariş #${order.id}`,
      // Map other optional fields if needed
    }
    
    // Add piece details if available (optional)
    if (order.items.length > 0) {
        arasOrderInfo.PieceDetails = order.items.map(item => ({
            BarcodeNumber: item.id.slice(-20), // Placeholder barcode, maybe use sku?
            Description: item.product.name.slice(0, 60),
            Weight: '1', // Dummy weight
            VolumetricWeight: '1' // Dummy desi
        }));
        arasOrderInfo.PieceCount = order.items.length.toString();
    }

    // 4. Call Service
    const result = await createArasOrder(arasOrderInfo)

    // 5. Build Response
    if (result.resultCode === '0') {
        // Success
        // Update Order
        await prisma.order.update({
            where: { id: orderId },
            data: {
                shippingCarrier: 'ARAS',
                shippingTrackingNumber: result.resultMessage === 'Başarılı' ? order.id : undefined, // Aras sometimes returns tracking number in message or separate query
                status: 'SHIPPED' // Auto update status? Maybe optional.
            }
        })
        
        return NextResponse.json({ 
            success: true, 
            message: 'Aras Kargo shipment created successfully',
            details: result
        })
    } else {
        // Failure from Aras
        return NextResponse.json({ 
            success: false, 
            message: `Aras Kargo Error: ${result.resultMessage}`,
            details: result
        }, { status: 400 }) // Bad request to indicate failure
    }

  } catch (error: any) {
    console.error('Error creating Aras shipment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create shipment' },
      { status: 500 }
    )
  }
}
