import { BannerCarouselClient } from "./client"
import { headers } from 'next/headers'



export default async function BannerCarousel({ locale }: { locale: string }) {
  // Fetch banners via API to avoid DB queries in components
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  let banners: any[] = []
  try {
    const res = await fetch(`${baseUrl}/api/banners?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      banners = Array.isArray(data?.banners) ? data!.banners : []
    }
  } catch {
    // ignore and keep empty banners
  }

  return (
    <BannerCarouselClient banners={banners} />
  )
}