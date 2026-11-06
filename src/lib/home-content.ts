import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'

export type HomeBanner = {
  id: string
  image: string
  linkUrl: string | null
  sortOrder: number
  active: boolean
  title?: string | null
  description?: string | null
}

export type HomeCategoryNavItem = {
  id: string
  name: string
  slug: string | null
}

async function loadHomeBanners(locale: string): Promise<HomeBanner[]> {
  try {
    const withLocale = await prisma.banner.findMany({
      where: { active: true, translations: { some: { locale } } },
      include: { translations: { where: { locale } } },
      orderBy: { sortOrder: 'asc' },
    })

    const banners =
      withLocale.length > 0
        ? withLocale
        : await prisma.banner.findMany({
            where: { active: true },
            include: { translations: { where: { locale } } },
            orderBy: { sortOrder: 'asc' },
          })

    return banners.map((banner) => {
      const translation = banner.translations[0]
      return {
        id: banner.id,
        image: banner.image,
        linkUrl: banner.linkUrl,
        sortOrder: banner.sortOrder,
        active: banner.active,
        title: translation?.title,
        description: translation?.description,
      }
    })
  } catch (error) {
    console.error('[HOME_BANNERS_FETCH]', error)
    return []
  }
}

export const getHomeBanners = unstable_cache(loadHomeBanners, ['home-banners'], {
  revalidate: 300,
  tags: ['banners'],
})

async function loadPromoTexts(locale: string): Promise<string[]> {
  try {
    const items = await prisma.promoText.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: { translations: { where: { locale }, select: { text: true } } },
    })

    return items
      .map((item) => item.translations[0]?.text?.trim())
      .filter((text): text is string => Boolean(text))
  } catch (error) {
    console.error('[HOME_PROMO_FETCH]', error)
    return []
  }
}

export const getHomePromoTexts = unstable_cache(loadPromoTexts, ['home-promo-texts'], {
  revalidate: 300,
  tags: ['promo-texts'],
})

async function loadHomeCategories(locale: string): Promise<HomeCategoryNavItem[]> {
  try {
    const rows = await prisma.category.findMany({
      include: { translations: { where: { locale } } },
      orderBy: { name: 'asc' },
    })

    return rows.map((category) => ({
      id: category.id,
      name: category.translations[0]?.name || category.name,
      slug: category.translations[0]?.slug || category.slug || null,
    }))
  } catch (error) {
    console.error('[HOME_CATEGORIES_FETCH]', error)
    return []
  }
}

export const getHomeCategories = unstable_cache(loadHomeCategories, ['home-categories'], {
  revalidate: 600,
  tags: ['categories'],
})
