"use client"

import { useEffect, useRef, useState } from 'react'

export default function PromoTickerClient({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState<string | null>(null)
  const [current, setCurrent] = useState<string>(texts[0])
  const prevRef = useRef<HTMLDivElement | null>(null)
  const currRef = useRef<HTMLDivElement | null>(null)

  // Show current text immediately on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      if (currRef.current) {
        currRef.current.style.transform = 'translateY(0)'
        currRef.current.style.opacity = '1'
      }
    })
  }, [])

  // Rotate texts every 4 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setPrev(current)
      const nextIndex = (index + 1) % texts.length
      setIndex(nextIndex)
      setCurrent(texts[nextIndex])
      // Trigger slide animation
      requestAnimationFrame(() => {
        if (prevRef.current) {
          prevRef.current.style.transform = 'translateY(-100%)'
          prevRef.current.style.opacity = '0'
        }
        if (currRef.current) {
          currRef.current.style.transform = 'translateY(0)'
          currRef.current.style.opacity = '1'
        }
      })
    }, 4000)
    return () => clearInterval(iv)
  }, [index, current, texts])

  return (
    <div className="bg-primary/10 text-primary-foreground">
      <div className="mx-auto justify-center max-w-7xl px-4 py-2">
        <div className="relative justify-center h-6 overflow-hidden">
          {/* Previous text (slides up) */}
          {prev !== null && (
            <div
              ref={prevRef}
              className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
              style={{ transform: 'translateY(0)', opacity: 1 }}
            >
              <span className="text-sm font-bold text-primary text-center">{prev}</span>
            </div>
          )}
          {/* Current text (slides in from bottom) */}
          <div
            ref={currRef}
            className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
            style={{ transform: 'translateY(100%)', opacity: 0 }}
          >
            <span className="text-sm text-primary text-center font-bold">{current}</span>
          </div>
        </div>
      </div>
    </div>
  )
}