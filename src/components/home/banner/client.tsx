"use client";
import Image from 'next/image'
import Link from 'next/link'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from "embla-carousel-autoplay"

export function BannerCarouselClient({ banners }: { banners: any[] }) {
  return (
    <div className='relative'>
      <Carousel plugins={[
        Autoplay({
          delay: 5000,
        }),
      ]}
        opts={{ loop: true }}
        className='w-full'
      >
        <CarouselContent>
          {banners.map((item: any, index: number) => (
            <CarouselItem key={item.id}>
              <Link href={item.linkUrl || '#'} className='block'>
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
                    {item.description ? (
                      <p className='text-sm text-gray-200'>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='left-4 md:left-8 ' />
        <CarouselNext className='right-4 md:right-8 ' />
      </Carousel>
    </div>)
}
