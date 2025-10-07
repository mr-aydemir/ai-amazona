"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"

interface ProductGalleryProps {
  images: string[]
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)

  // Hooks should run unconditionally; render empty state inside JSX instead of early return

  // Sync selected index when carousel changes
  useEffect(() => {
    if (!carouselApi) return
    const updateIndex = () => setSelectedImage(carouselApi.selectedScrollSnap())
    updateIndex()
    carouselApi.on("select", updateIndex)
    return () => {
      carouselApi.off("select", updateIndex)
    }
  }, [carouselApi])

  const openZoom = useCallback(() => {
    setIsZoomOpen(true)
    setZoomScale(1.75)
    setTranslate({ x: 0, y: 0 })
  }, [])

  const closeZoom = useCallback(() => {
    setIsZoomOpen(false)
    setZoomScale(1)
    setTranslate({ x: 0, y: 0 })
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  const onWheel: React.WheelEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      // Zoom in/out with wheel when overlay open
      if (!isZoomOpen) return
      e.preventDefault()
      const delta = -e.deltaY
      setZoomScale((prev) => {
        const next = Math.min(3, Math.max(1, prev + delta * 0.0015))
        return Number(next.toFixed(3))
      })
    },
    [isZoomOpen]
  )

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!isZoomOpen) return
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y }
    },
    [isZoomOpen, translate.x, translate.y]
  )

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!isZoomOpen || !isDragging || !dragStartRef.current) return
      setTranslate({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
    },
    [isZoomOpen, isDragging]
  )

  const onMouseUpOrLeave: React.MouseEventHandler<HTMLDivElement> = useCallback(() => {
    if (!isZoomOpen) return
    setIsDragging(false)
    dragStartRef.current = null
  }, [isZoomOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeZoom])

  // Disable page scroll while zoom overlay is open
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    if (isZoomOpen) {
      const prevHtml = html.style.overflow
      const prevBody = body.style.overflow
      html.style.overflow = "hidden"
      body.style.overflow = "hidden"
      return () => {
        html.style.overflow = prevHtml
        body.style.overflow = prevBody
      }
    } else {
      html.style.overflow = ""
      body.style.overflow = ""
    }
  }, [isZoomOpen])

  return (
    <div className="space-y-4">
      {/* Empty State (shown when no images) */}
      {!images?.length && (
        <div className="aspect-square w-full bg-secondary flex items-center justify-center rounded-lg">
          <span className="text-muted-foreground">No image available</span>
        </div>
      )}
      {/* Main Carousel */}
      <Carousel
        setApi={setCarouselApi}
        className="relative"
        opts={{ loop: true }}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={image} className="">
              <button
                type="button"
                onClick={openZoom}
                aria-label="Zoom image"
                className="aspect-square w-full relative rounded-lg overflow-hidden"
              >
                <Image
                  src={image}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 bg-white/80 text-black shadow border-0" />
            <CarouselNext className="right-4 top-1/2 -translate-y-1/2 bg-white/80 text-black shadow border-0" />
          </>
        )}
      </Carousel>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <button
              key={image}
              className={cn(
                "aspect-square relative rounded-lg overflow-hidden",
                selectedImage === index && "ring-2 ring-primary"
              )}
              onClick={() => {
                setSelectedImage(index)
                carouselApi?.scrollTo(index)
              }}
              aria-label={`Go to image ${index + 1}`}
            >
              <Image
                src={image}
                alt={`Product thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 10vw"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Overlay */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={closeZoom}
          onWheel={onWheel}
        >
          <div
            className="absolute inset-0 flex items-center justify-center select-none overscroll-none"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
          >
            <div
              className="relative"
              style={{
                width: "80vw",
                height: "80vh",
                cursor: isDragging ? "grabbing" : "grab",
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-lg select-none" onClick={(e) => e.stopPropagation()} onDragStart={(e) => e.preventDefault()}>
                <Image
                  src={images[selectedImage]}
                  alt="Zoomed product image"
                  fill
                  className="object-contain select-none"
                  sizes="80vw"
                  priority
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoomScale})`,
                    transition: isDragging ? "none" : "transform 120ms ease-out",
                  }}
                  draggable={false}
                />
              </div>

              {/* Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomScale((prev) => Math.max(1, prev - 0.25))
                  }}
                  aria-label="Zoom out"
                  className="h-8 w-8 rounded-full bg-white/90 text-black shadow flex items-center justify-center"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                {/* Zoom In */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomScale((prev) => Math.min(4, prev + 0.25))
                  }}
                  aria-label="Zoom in"
                  className="h-8 w-8 rounded-full bg-white/90 text-black shadow flex items-center justify-center"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const prev = Math.max(0, selectedImage - 1)
                        setSelectedImage(prev)
                        carouselApi?.scrollTo(prev)
                      }}
                      aria-label="Previous image"
                      className="h-8 w-8 rounded-full bg-white/90 text-black shadow flex items-center justify-center"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = Math.min(images.length - 1, selectedImage + 1)
                        setSelectedImage(next)
                        carouselApi?.scrollTo(next)
                      }}
                      aria-label="Next image"
                      className="h-8 w-8 rounded-full bg-white/90 text-black shadow flex items-center justify-center"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                {/* Close at far right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeZoom()
                  }}
                  aria-label="Close"
                  className="h-8 w-8 rounded-full bg-white/90 text-black shadow flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
