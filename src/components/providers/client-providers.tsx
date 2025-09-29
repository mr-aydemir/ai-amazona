'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

interface ClientProvidersProps extends ThemeProviderProps {
  children: React.ReactNode
}

export function ClientProviders({ children, ...props }: ClientProvidersProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
      <Toaster />
      <SonnerToaster />
    </NextThemesProvider>
  )
}