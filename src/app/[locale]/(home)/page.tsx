import Image from 'next/image'
import { LatestProducts } from '@/components/home/latest-products'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

async function getLatestProducts(locale: string) {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/products/${locale}?limit=8&sort=default`, { cache: 'no-store' })
  if (!res.ok) {
    return []
  }
  const data = await res.json().catch(() => null)
  const products = Array.isArray(data?.products) ? data.products : []
  return products
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const latestProducts = await getLatestProducts(locale)

  // Fetch pricing settings on the server
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  let vatRate: number | undefined
  let showInclVat: boolean | undefined
  try {
    const settingsRes = await fetch(`${baseUrl}/api/admin/currency`, { cache: 'no-store' })
    if (settingsRes.ok) {
      const settings = await settingsRes.json()
      vatRate = typeof settings?.vatRate === 'number' ? settings.vatRate : undefined
      showInclVat = typeof settings?.showPricesInclVat === 'boolean' ? settings.showPricesInclVat : undefined
    }
  } catch {
    // ignore
  }

  const bannerItems = [
    {
      image: '/images/banner1.jpg',
      title: 'New Arrivals',
      description: 'Check out our latest collection of amazing products',
    },
    {
      image: '/images/banner2.jpg',
      title: 'Special Offers',
      description: 'Get up to 50% off on selected items',
    },
    {
      image: '/images/banner3.jpg',
      title: 'Free Shipping',
      description: 'On orders over $100',
    },
  ]

  return (
    <div className='space-y-8 mt-6'>
      <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='relative'>
          <Carousel
            opts={{
              loop: true,
            }}
            className='w-full'
          >
            <CarouselContent>
              {bannerItems.map((item, index) => (
                <CarouselItem key={index}>
                  <div className='relative aspect-[21/9] w-full overflow-hidden rounded-lg'>
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className='object-cover'
                      priority={index === 0}
                    />
                    <div className='absolute inset-0 bg-black/20' />
                    <div className='absolute bottom-0 left-0 right-0 p-6 text-white bg-gradient-to-t from-black/60 to-transparent'>
                      <h3 className='text-2xl font-bold mb-2'>{item.title}</h3>
                      <p className='text-sm text-gray-200'>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className='left-4 md:left-8 bg-background/80 hover:bg-background/90 border-border' />
            <CarouselNext className='right-4 md:right-8 bg-background/80 hover:bg-background/90 border-border' />
          </Carousel>
        </div>
      </section>

      <LatestProducts products={latestProducts} vatRate={vatRate} showInclVat={showInclVat} />
    </div>
  )
}
