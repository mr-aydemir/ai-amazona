'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { locales } from '@/i18n/config'

const languageNames = {
  en: 'English',
  tr: 'Türkçe'
} as const

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  // Debug logging
  console.log('LanguageSwitcher - Current locale:', locale)
  console.log('LanguageSwitcher - Current pathname:', pathname)

  const switchLanguage = (newLocale: string) => {
    console.log('switchLanguage called with:', newLocale)
    console.log('Current pathname before switch:', pathname)
    
    // Remove the current locale from the pathname
    const segments = pathname.split('/').filter(Boolean)
    console.log('Path segments:', segments)
    
    // Check if the first segment is a locale
    const isFirstSegmentLocale = segments.length > 0 && locales.includes(segments[0] as any)
    console.log('Is first segment a locale?', isFirstSegmentLocale, 'First segment:', segments[0])
    
    // Get path without locale
    const pathWithoutLocale = isFirstSegmentLocale 
      ? '/' + segments.slice(1).join('/') 
      : pathname
    console.log('Path without locale:', pathWithoutLocale)
    
    // Ensure path starts with / and doesn't end with / (unless it's root)
    const cleanPath = pathWithoutLocale === '/' ? '' : pathWithoutLocale
    console.log('Clean path:', cleanPath)
    
    const finalUrl = `/${newLocale}${cleanPath}`
    console.log('Final URL to navigate to:', finalUrl)
    
    // Navigate to the new locale
    router.push(finalUrl)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
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
            disabled={locale === lang}
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