import PromoTickerClient from './promo-ticker.client'
import { getHomePromoTexts } from '@/lib/home-content'

export default async function PromoTicker({ locale }: { locale: string }) {
  try {
    const texts = await getHomePromoTexts(locale)
    if (texts.length === 0) return null
    return <PromoTickerClient texts={texts} />
  } catch (error) {
    console.error('Failed to load promo texts:', error)
    return null
  }
}
