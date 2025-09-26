import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { iyzicoClient, IYZICO_PAYMENT_STATUS } from '@/lib/iyzico'
import { redirect } from 'next/navigation'

export async function POST(request: NextRequest) {
  return handleCallback(request)
}

export async function GET(request: NextRequest) {
  return handleCallback(request)
}

async function handleCallback(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return redirect('/payment/failure?error=missing_token')
    }

    // İyzico'dan ödeme sonucunu al
    const result = await iyzicoClient.retrieveCheckoutForm(token)

    if (!result) {
      return redirect('/payment/failure?error=invalid_response')
    }

    // Siparişi bul
    const order = await prisma.order.findFirst({
      where: {
        iyzicoToken: token
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return redirect('/payment/failure?error=order_not_found')
    }

    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
      // Ödeme başarılı
      await prisma.$transaction(async (tx) => {
        // Siparişi güncelle
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            iyzicoPaymentId: result.paymentId,
            iyzicoPaymentStatus: result.paymentStatus,
            paidAt: new Date()
          }
        })

        // Stok güncelle
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          })
        }
      })

      return redirect(`/payment/success?orderId=${order.id}`)
    } else {
      // Ödeme başarısız
      await prisma.order.update({
        where: { id: order.id },
        data: {
          iyzicoPaymentStatus: result.paymentStatus || 'FAILURE',
          iyzicoErrorMessage: result.errorMessage || 'Payment failed'
        }
      })

      const errorParam = result.errorMessage ? encodeURIComponent(result.errorMessage) : 'payment_failed'
      return redirect(`/payment/failure?error=${errorParam}&orderId=${order.id}`)
    }

  } catch (error) {
    console.error('İyzico callback error:', error)
    return redirect('/payment/failure?error=callback_error')
  }
}