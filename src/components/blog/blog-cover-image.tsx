'use client'

import { useEffect, useMemo, useState } from 'react'

const DEFAULT_FALLBACK = '/images/blog/default.svg'

function resolveSrc(src: string | null | undefined) {
  if (!src) return DEFAULT_FALLBACK
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return `/api/blog/cover?url=${encodeURIComponent(src)}`
  }
  return src
}

type BlogCoverImageProps = {
  src: string | null | undefined
  alt: string
  fallbackSrc?: string
  className?: string
  priority?: boolean
}

export function BlogCoverImage({
  src,
  alt,
  fallbackSrc,
  className,
  priority = false,
}: BlogCoverImageProps) {
  const primary = useMemo(() => resolveSrc(src), [src])
  const secondary = fallbackSrc || DEFAULT_FALLBACK
  const [current, setCurrent] = useState(primary)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setCurrent(primary)
    setStage(0)
  }, [primary])

  const handleError = () => {
    if (stage === 0) {
      setCurrent(secondary)
      setStage(1)
      return
    }
    if (stage === 1) {
      setCurrent(DEFAULT_FALLBACK)
      setStage(2)
    }
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
    />
  )
}
