import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'
import { Order, OrderItem, Product, Address } from '@prisma/client'
import CheckoutSteps from '@/components/checkout/checkout-steps'

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

  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const order = (await prisma.order.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })) as OrderWithRelations | null

  if (!order) {
    redirect('/')
  }

  return (
    <div className='min-h-[calc(100vh-4rem)] py-10 px-4'>
      {/* Checkout Steps - En üstte */}
      <div className='w-full max-w-7xl mx-auto mb-8'>
        <CheckoutSteps currentStep={3} />
      </div>

      <div className='flex items-center justify-center'>
        <div className='w-full max-w-2xl'>
          <div className='rounded-lg border p-8 space-y-6 bg-white shadow-sm'>
            <div className='flex items-center space-x-4'>
              <CheckCircle className='h-8 w-8 text-green-500' />
              <div>
                <h1 className='text-2xl font-bold'>Order Confirmed!</h1>
                <p className='text-gray-500'>Order #{id}</p>
              </div>
            </div>

            <div className='space-y-4'>
              <h2 className='text-lg font-semibold'>Order Summary</h2>
              <div className='divide-y'>
                {order.items.map((item) => (
                  <div key={item.id} className='flex justify-between py-4'>
                    <div>
                      <p className='font-medium'>{item.product.name}</p>
                      <p className='text-sm text-gray-500'>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className='font-medium'>
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Shipping</span>
                <span>{formatPrice(10)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Tax</span>
                <span>{formatPrice(order.total * 0.1)}</span>
              </div>
              <div className='flex justify-between font-bold'>
                <span>Total</span>
                <span>{formatPrice(order.total + 10 + order.total * 0.1)}</span>
              </div>
            </div>

            <div className='space-y-2'>
              <h2 className='text-lg font-semibold'>Shipping Address</h2>
              <div className='text-gray-500'>
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
