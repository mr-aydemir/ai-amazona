'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

const TRACK_ENDPOINT = '/api/analytics/track'

function isPrivatePath(pathname: string) {
  return /\/admin(\/|$)|\/dashboard(\/|$)/.test(pathname)
}

type TrackPayload = {
  event: 'PAGE_VIEW' | 'PAGE_LEAVE'
  url: string
  duration?: number
  referrer?: string
  userAgent?: string
  width?: number
  height?: number
  title?: string
}

function sendEvent(payload: TrackPayload, preferBeacon = false) {
  const body = JSON.stringify(payload)

  if (preferBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: 'application/json' }))
    return
  }

  fetch(TRACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never break the page.
  })
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const startedAtRef = useRef<number>(Date.now())
  const currentPathRef = useRef<string>('')

  useEffect(() => {
    if (!pathname || isPrivatePath(pathname)) return

    const previousPath = currentPathRef.current
    if (previousPath && previousPath !== pathname) {
      sendEvent(
        {
          event: 'PAGE_LEAVE',
          url: previousPath,
          duration: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        },
        true
      )
    }

    currentPathRef.current = pathname
    startedAtRef.current = Date.now()

    sendEvent(
      {
        event: 'PAGE_VIEW',
        url: pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        width: window.innerWidth,
        height: window.innerHeight,
        title: document.title,
      },
      true
    )
  }, [pathname, searchParams])

  useEffect(() => {
    const flush = () => {
      const path = currentPathRef.current
      if (!path || isPrivatePath(path)) return

      sendEvent(
        {
          event: 'PAGE_LEAVE',
          url: path,
          duration: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        },
        true
      )
      startedAtRef.current = Date.now()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
