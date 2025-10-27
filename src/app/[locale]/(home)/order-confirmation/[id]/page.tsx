import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { getCurrencyData } from '@/lib/server-currency'
import { getLocale } from 'next-intl/server'
import { CheckCircle } from 'lucide-react'
import { Order, OrderItem, Product, Address } from '@prisma/client'
import CheckoutSteps from '@/components/checkout/checkout-steps'
import { formatCurrency } from '@/lib/utils'

type OrderParams = Promise<{ id: string }>

interface PageProps {
  params: OrderParams
}

interface OrderWithRelations extends Order {
  items: (OrderItem & {
    product: Product
  })[]
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const ordersRes = await fetch(`${baseUrl}/api/orders`, { cache: 'no-store', headers: { cookie } })
  if (!ordersRes.ok) {
    redirect('/')
  }
  const ordersData = await ordersRes.json().catch(() => null)
  const order = (Array.isArray(ordersData?.orders)
    ? ordersData.orders.find((o: any) => o.id === id)
    : null) as OrderWithRelations | null

  if (!order) {
    redirect('/')
  }

  // Para birimi ve dönüşüm
  const displayCurrency = order.paymentCurrency || (locale === 'en' ? 'USD' : 'TRY')
  const conversionRate = order.conversionRate ?? (await (async () => {
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
  const nfLocale = locale?.startsWith('en') ? 'en-US' : 'tr-TR'
  const fmt = (amount: number) => formatCurrency(amount, displayCurrency, nfLocale)

  const subtotalBase = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const shippingBase = order.shippingCost || 0
  const taxBase = order.total * 0.1
  const totalBase = order.total + shippingBase + taxBase
  const subtotal = subtotalBase * conversionRate
  const shipping = shippingBase * conversionRate
  const tax = taxBase * conversionRate
  const total = (typeof order.paidAmount === 'number') ? order.paidAmount : totalBase * conversionRate

  return (
    <div className='min-h-[calc(100vh-4rem)] py-10 px-4'>
      {/* Checkout Steps - En üstte */}
      <div className='w-full max-w-7xl mx-auto mb-8'>
        <CheckoutSteps currentStep={3} />
      </div>

      <div className='flex items-center justify-center'>
        <div className='w-full max-w-2xl'>
          <div className='rounded-lg border-border border p-8 space-y-6 bg-background shadow-sm'>
            <div className='flex items-center space-x-4'>
              <CheckCircle className='h-8 w-8 text-green-500' />
              <div>
                <h1 className='text-2xl font-bold'>Order Confirmed!</h1>
                <p className='text-muted-foreground'>Order #{id}</p>
              </div>
            </div>

            <div className='space-y-4'>
              <h2 className='text-lg font-semibold'>Order Summary</h2>
              <div className='divide-y'>
                {order.items.map((item) => (
                  <div key={item.id} className='flex justify-between py-4'>
                    <div>
                      <p className='font-medium'>{item.product.name}</p>
                      <p className='text-sm text-muted-foreground'>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className='font-medium'>
                      {fmt(item.price * item.quantity * conversionRate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Shipping</span>
                <span>{fmt(shipping)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Tax</span>
                <span>{fmt(tax)}</span>
              </div>
              <div className='flex justify-between font-bold'>
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            <div className='space-y-2'>
              <h2 className='text-lg font-semibold'>Shipping Address</h2>
              <div className='text-muted-foreground'>
                {order.shippingStreet}
                <br />
                {order.shippingCity}, {order.shippingState}{' '}
                {order.shippingPostalCode}
                <br />
                {order.shippingCountry}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
