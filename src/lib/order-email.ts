import { prisma } from '@/lib/prisma'
import { sendEmail, renderEmailTemplate } from '@/lib/email'
import { getUserPreferredLocale } from '@/lib/user-locale'

export async function sendOrderReceivedEmail(orderId: string) {
  try {
    const baseOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    })

    if (!baseOrder) {
      console.warn('[ORDER_EMAIL] Order not found:', orderId)
      return
    }

    const userLocale = baseOrder.userId
      ? await getUserPreferredLocale(baseOrder.userId)
      : 'tr'

    //const locales = [userLocale, 'en', 'tr']

    const orderForEmail = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                translations: true
              }
            }
          }
        }
      }
    })

    const to = baseOrder.shippingEmail || orderForEmail?.user?.email || ''
    if (!to) {
      console.warn('[ORDER_EMAIL] No recipient email for order:', orderId)
      return
    }

    const currency = userLocale === 'en' ? 'USD' : 'TRY'
    const currencySymbol = userLocale === 'en' ? '$' : '₺'

    const itemsHtml = (orderForEmail?.items || [])
      .map((it) => {
        const translations = it.product?.translations || []

        const name = translations.find(l => l.locale === userLocale)?.name ?? it.product.name;
        const qty = it.quantity
        const lineTotal = (it.price * it.quantity).toFixed(2)
        return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                <div style="color:#555;font-size:13px;">${currencySymbol}${lineTotal}</div>
              </div>`
      })
      .join('')

    const totalFormatted = new Intl.NumberFormat(
      userLocale === 'en' ? 'en-US' : 'tr-TR',
      { style: 'currency', currency }
    ).format(baseOrder.total)

    const orderDateFormatted = baseOrder.createdAt
      ? new Date(baseOrder.createdAt).toLocaleString(
        userLocale === 'en' ? 'en-US' : 'tr-TR'
      )
      : ''

    const orderUrl = `${process.env.NEXTAUTH_URL}/${userLocale}/order-confirmation/${orderId}`

    const html = await renderEmailTemplate(userLocale, 'order-received', {
      orderId: orderId,
      userName: baseOrder.shippingFullName || orderForEmail?.user?.name || '',
      total: totalFormatted,
      orderDate: orderDateFormatted,
      itemsHtml,
      orderUrl,
    })

    const subject =
      userLocale === 'en'
        ? 'Order Received - Hivhestin'
        : 'Siparişiniz Alındı - Hivhestin'

    await sendEmail({ to, subject, html })
  } catch (error) {
    console.error('[ORDER_EMAIL] Failed to send order received email:', error)
  }
}