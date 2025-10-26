'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Loader2 } from 'lucide-react'
import { locales } from '@/i18n/config'
import { useToast } from '@/hooks/use-toast'

const languageNames = {
  en: 'English',
  tr: 'Türkçe'
} as const

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const switchLanguage = async (newLocale: string) => {
    if (newLocale === locale) return

    setIsUpdating(true)

    try {
      // If user is authenticated, update their preference in the database
      if (session?.user) {
        const response = await fetch('/api/user/language', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: newLocale }),
        })

        if (!response.ok) {
          throw new Error('Failed to update language preference')
        }
      }

      // Remove the current locale from the pathname
      const segments = pathname.split('/').filter(Boolean)

      // Check if the first segment is a locale
      const isFirstSegmentLocale = segments.length > 0 && locales.includes(segments[0] as any)

      // Special case: product detail page; redirect to translated slug if available
      const isProductDetail = isFirstSegmentLocale && segments[1] === 'products' && typeof segments[2] === 'string'
      if (isProductDetail) {
        const currentSlug = decodeURIComponent(segments[2]!)
        try {
          const resp = await fetch(`/api/products/slug-map/${locale}/${encodeURIComponent(currentSlug)}`, { cache: 'no-store' })
          if (resp.ok) {
            const data = await resp.json().catch(() => null)
            const translatedSlug = data?.slugs?.[newLocale] || null
            const target = typeof translatedSlug === 'string' && translatedSlug.length > 0
              ? translatedSlug
              : (data?.productId || currentSlug)
            router.push(`/${newLocale}/products/${target}`)
            return
          }
        } catch (e) {
          // Ignore errors and fallback to default path rewrite below
        }
      }

      // Special case: products listing page with category filter; convert category slug
      const isProductsListing = isFirstSegmentLocale && segments[1] === 'products' && !segments[2]
      if (isProductsListing && typeof window !== 'undefined') {
        const currentSearch = new URLSearchParams(window.location.search)
        const currentCategory = currentSearch.get('category')
        if (currentCategory) {
          try {
            const resp = await fetch(`/api/categories/slug-map/${locale}/${encodeURIComponent(currentCategory)}`, { cache: 'no-store' })
            if (resp.ok) {
              const data = await resp.json().catch(() => null)
              const translatedCatSlug = data?.slugs?.[newLocale] || null
              const target = typeof translatedCatSlug === 'string' && translatedCatSlug.length > 0
                ? translatedCatSlug
                : (data?.categoryId || currentCategory)
              currentSearch.set('category', String(target))
              const qs = currentSearch.toString()
              router.push(`/${newLocale}/products${qs ? `?${qs}` : ''}`)
              return
            }
          } catch (e) {
            // Ignore errors and fallback to default path rewrite below
          }
        }
      }

      // Generic rewrite: Get path without locale and prefix new locale
      const pathWithoutLocale = isFirstSegmentLocale
        ? '/' + segments.slice(1).join('/')
        : pathname

      // Ensure path starts with / and doesn't end with / (unless it's root)
      const cleanPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale

      const finalUrl = `/${newLocale}${cleanPath}`

      // Navigate to the new locale
      router.push(finalUrl)
    } catch (error) {
      console.error('Error updating language preference:', error)
      toast({
        title: 'Error',
        description: 'Failed to update language preference. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {languageNames[locale as keyof typeof languageNames]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => switchLanguage(lang)}
            className={locale === lang ? 'bg-accent text-accent-foreground font-medium' : ''}
            disabled={locale === lang || isUpdating}
          >
            <div className="flex items-center justify-between w-full">
              <span className={locale === lang ? 'font-medium' : ''}>
                {languageNames[lang as keyof typeof languageNames]}
              </span>
              {locale === lang && <span className="ml-2 text-green-600">✓</span>}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}