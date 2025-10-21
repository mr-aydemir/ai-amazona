import PromoTickerClient from './promo-ticker.client'
import { headers } from 'next/headers'

export default async function PromoTicker({ locale }: { locale: string }) {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  try {
    const res = await fetch(`${baseUrl}/api/promo-texts/${locale}`, { cache: 'no-store' })
    if (!res.ok) {
      return null
    }
    const data: { texts: string[] } = await res.json()
    const texts = (data.texts || []).filter((t) => t && t.trim().length > 0)

    if (texts.length === 0) {
      return null
    }

    return <PromoTickerClient texts={texts} />
  } catch (e) {
    console.error('Failed to load promo texts:', e)
    return null
  }
}