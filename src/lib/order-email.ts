import { prisma } from '@/lib/prisma'
import { sendEmail, renderEmailTemplate } from '@/lib/email'
import { getUserPreferredLocale } from '@/lib/user-locale'
import { getCurrencyData } from '@/lib/server-currency'
import { defaultLocale } from '@/i18n/config'
import { formatCurrency } from '@/lib/utils'

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

    // Prefer payment currency stored on the order; fallback by locale
    const displayCurrency = baseOrder.paymentCurrency || (userLocale === 'en' ? 'USD' : 'TRY')
    const conversionRate = baseOrder.conversionRate ?? (await (async () => {
      try {
        const { baseCurrency, rates } = await getCurrencyData()
        const map = new Map(rates.map(r => [r.currency, r.rate]))
        const baseRate = Number(map.get(baseCurrency)) || 1
        const displayRate = Number(map.get(displayCurrency)) || baseRate
        return displayRate / baseRate
      } catch {
        return 1
      }
    })())

    const itemsHtml = (orderForEmail?.items || [])
      .map((it) => {
        const translations = it.product?.translations || []

        const name = translations.find(l => l.locale === userLocale)?.name ?? it.product.name
        const qty = it.quantity
        const lineTotalDisplay = (it.price * qty * conversionRate)
        const lineTotalFormatted = new Intl.NumberFormat(
          userLocale === 'en' ? 'en-US' : 'tr-TR',
          { style: 'currency', currency: displayCurrency }
        ).format(lineTotalDisplay)

        return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                <div style="color:#555;font-size:13px;">${lineTotalFormatted}</div>
              </div>`
      })
      .join('')

    const totalDisplayAmount = typeof baseOrder.paidAmount === 'number'
      ? baseOrder.paidAmount
      : baseOrder.total * conversionRate
    const totalFormatted = new Intl.NumberFormat(
      userLocale === 'en' ? 'en-US' : 'tr-TR',
      { style: 'currency', currency: displayCurrency }
    ).format(totalDisplayAmount)

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
        ? 'Order Received - Hivhestın'
        : 'Siparişiniz Alındı - Hivhestın'

    await sendEmail({ to, subject, html })
  } catch (error) {
    console.error('[ORDER_EMAIL] Failed to send order received email:', error)
  }
}

export async function sendOrderShippedEmail(orderId: string) {
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

    const to = baseOrder.shippingEmail || baseOrder.user?.email || ''
    if (!to) {
      console.warn('[ORDER_EMAIL] No recipient email for shipped order:', orderId)
      return
    }

    const trackingNumber = baseOrder.shippingTrackingNumber || ''
    const trackingUrl = baseOrder.shippingTrackingUrl || ''
    const carrier = (baseOrder as any).shippingCarrier || ''
    const orderUrl = `${process.env.NEXTAUTH_URL}/${userLocale}/order/${orderId}`

    // Fetch items with product translations for localized names
    const orderForEmail = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { translations: true }
            }
          }
        }
      }
    })

    const itemsSection = (() => {
      const items = orderForEmail?.items || []
      if (!items.length) return ''

      const title = userLocale === 'en' ? 'Ordered Products' : 'Sipariş Ürünleri'
      const rows = items
        .map((it) => {
          const translations = it.product?.translations || []
          const name = translations.find(l => l.locale === userLocale)?.name ?? it.product.name
          const qty = it.quantity
          return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                    <div style="color:#333;font-size:14px;">${name}</div>
                    <div style="color:#555;font-size:13px;">× ${qty}</div>
                  </div>`
        })
        .join('')

      return `<div class="card">
                <h3 style="margin:0 0 8px 0;">${title}</h3>
                ${rows}
              </div>`
    })()

    const trackingUrlSection = trackingUrl
      ? `<p><strong>Takip Linki:</strong> <a class="btn" href="${trackingUrl}" target="_blank" rel="noopener noreferrer">Kargo Takibini Aç</a></p>`
      : ''

    const carrierSection = carrier
      ? `<p><strong>Kargo Firması:</strong> ${carrier}</p>`
      : ''

    const html = await renderEmailTemplate(userLocale, 'order-shipped', {
      orderId,
      userName: baseOrder.shippingFullName || baseOrder.user?.name || '',
      trackingNumber,
      trackingUrlSection,
      carrierSection,
      itemsSection,
      orderUrl,
    })

    const subject = userLocale === 'en'
      ? 'Your Order Has Shipped - Hivhestın'
      : 'Siparişiniz Kargoya Verildi - Hivhestın'

    await sendEmail({ to, subject, html })
  } catch (error) {
    console.error('[ORDER_EMAIL] Failed to send order shipped email:', error)
  }
}

/**
 * Ödeme sonrası bilgilendirme epostalarını admin kullanıcıların epostalarına gönderir.
 * Daha önce belirlenen alıcılar yerine ADMIN rolündeki kullanıcılar bilgilendirilir.
 */
export async function sendStaffOrderNotification(orderId: string) {
  try {
    // Yeni gereksinim: admin kullanıcıların epostaları alıcı olacak
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true }
    })

    if (!adminUsers || adminUsers.length === 0) {
      console.log('[STAFF_EMAIL] No admin users found, skipping')
      return
    }

    const baseOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    })

    if (!baseOrder) {
      console.warn('[STAFF_EMAIL] Order not found:', orderId)
      return
    }

    const staffLocale: 'tr' | 'en' = (defaultLocale as 'en' | 'tr')

    const orderForEmail = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { translations: true } }
          }
        }
      }
    })

    const displayCurrency = baseOrder.paymentCurrency || (staffLocale === 'en' ? 'USD' : 'TRY')
    const conversionRate = baseOrder.conversionRate ?? (await (async () => {
      try {
        const { baseCurrency, rates } = await getCurrencyData()
        const map = new Map(rates.map(r => [r.currency, r.rate]))
        const baseRate = Number(map.get(baseCurrency)) || 1
        const displayRate = Number(map.get(displayCurrency)) || baseRate
        return displayRate / baseRate
      } catch {
        return 1
      }
    })())

    const itemsHtml = (orderForEmail?.items || [])
      .map((it) => {
        const translations = it.product?.translations || []
        const name = translations.find(l => l.locale === staffLocale)?.name ?? it.product.name
        const qty = it.quantity
        const lineTotalDisplay = (it.price * qty * conversionRate)
        const lineTotalFormatted = formatCurrency(
          lineTotalDisplay,
          displayCurrency,
          staffLocale === 'en' ? 'en-US' : 'tr-TR'
        )
        return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                <div style="color:#555;font-size:13px;">${lineTotalFormatted}</div>
              </div>`
      })
      .join('')

    const totalDisplayAmount = typeof baseOrder.paidAmount === 'number'
      ? baseOrder.paidAmount
      : baseOrder.total * conversionRate
    const totalFormatted = formatCurrency(
      totalDisplayAmount,
      displayCurrency,
      staffLocale === 'en' ? 'en-US' : 'tr-TR'
    )

    const orderDateFormatted = baseOrder.createdAt
      ? new Date(baseOrder.createdAt).toLocaleString(
        staffLocale === 'en' ? 'en-US' : 'tr-TR'
      )
      : ''

    const originEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || ''
    const adminUrl = `${originEnv}/${staffLocale}/admin/orders`

    const templateLocale = staffLocale
    const html = await renderEmailTemplate(templateLocale, 'staff-order-received', {
      orderId,
      total: totalFormatted,
      orderDate: orderDateFormatted,
      itemsHtml,
      adminUrl
    })

    const shortId = `#${orderId.slice(-8)}`
    const subject = templateLocale === 'en'
      ? `New Payment — Order needs preparation ${shortId}`
      : `Yeni Ödeme — Hazırlanması gereken sipariş ${shortId}`

    for (const r of adminUsers) {
      try {
        await sendEmail({ to: r.email, subject, html })
      } catch (e) {
        console.error('[STAFF_EMAIL] Send error to', r.email, e)
      }
    }
  } catch (error) {
    console.error('[STAFF_EMAIL] Failed to send staff notification:', error)
  }
}