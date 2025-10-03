import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { iyzicoClient } from '@/lib/iyzico'
import { redirect } from 'next/navigation'
import { sendEmail, renderEmailTemplate } from '@/lib/email'

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
            product: {
              include: {
                translations: {
                  where: { locale: 'tr' }
                }
              }
            }
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

      // E-posta gönder
      try {
        const to = order.shippingEmail || ''
        if (to) {
          const itemsHtml = (order.items || [])
            .map((it) => {
              const name = it.product?.translations?.[0]?.name || it.product?.name || 'Ürün'
              const qty = it.quantity
              const lineTotal = (it.price * it.quantity).toFixed(2)
              return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                <div style="color:#555;font-size:13px;">₺${lineTotal}</div>
              </div>`
            })
            .join('')

          const totalFormatted = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.total)
          const orderDateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : ''
          const orderUrl = `${process.env.NEXTAUTH_URL}/tr/order-confirmation/${order.id}`

          const html = await renderEmailTemplate('tr', 'order-received', {
            orderId: order.id,
            userName: order.shippingFullName || '',
            total: totalFormatted,
            orderDate: orderDateFormatted,
            itemsHtml,
            orderUrl,
          })

          await sendEmail({ to, subject: 'Siparişiniz Alındı - Hivhestin', html })
        }
      } catch (emailError) {
        console.error('[EMAIL] Failed to send order received email:', emailError)
      }

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