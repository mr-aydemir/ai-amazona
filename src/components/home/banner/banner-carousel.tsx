import { BannerCarouselClient } from "./client"



export default async function BannerCarousel({ locale }: { locale: string }) {
  // Fetch banners via API to avoid DB queries in components
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/banners?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' })
  const data = res.ok ? await res.json().catch(() => null) : null
  const banners = Array.isArray(data?.banners) ? data!.banners : []

  return (
    <BannerCarouselClient banners={banners} />
  )
}