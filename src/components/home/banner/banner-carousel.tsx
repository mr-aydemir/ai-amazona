import { BannerCarouselClient } from './client'
import { getHomeBanners } from '@/lib/home-content'

export default async function BannerCarousel({ locale }: { locale: string }) {
  const banners = await getHomeBanners(locale)

  return <BannerCarouselClient banners={banners} />
}
