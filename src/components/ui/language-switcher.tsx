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

      // Get path without locale
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