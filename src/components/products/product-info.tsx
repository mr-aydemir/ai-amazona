'use client'

import { useState, useMemo, useEffect } from 'react'
import { LucideShoppingCart, Plus, ShoppingCart, Star, Share, Heart, Check, Cross, ShieldCheck, Truck, Info } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCart } from '@/store/use-cart'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import Link from 'next/link'
import { useCurrency } from '@/components/providers/currency-provider'
import { FavoriteButton } from '@/components/ui/favorite-button'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface ProductInfoProps {
  product: {
    id: string
    name: string
    description: string
    price: number
    originalPrice?: number
    stock: number
    images: string[]
    reviews: {
      rating: number
    }[]
    // Optional translations array present in API response
    translations?: { locale: string; name: string }[]
  }
  vatRate?: number
  showInclVat?: boolean
  initialFavorited?: boolean
  promoTexts?: string[]
  variants?: Array<{ id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null }>
  variantLabel?: string | null
  onVariantChange?: (variant: { id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null }) => void
}

export function ProductInfo({ product, vatRate: vatRateProp, showInclVat: showInclVatProp, initialFavorited, promoTexts = [], variants = [], variantLabel = null, onVariantChange }: ProductInfoProps) {
  const [quantity, setQuantity] = useState('1')
  const [activeProduct, setActiveProduct] = useState(product)
  const [favorited, setFavorited] = useState<boolean>(!!initialFavorited)
  const [favLoading, setFavLoading] = useState<boolean>(false)
  const cart = useCart()
  const { toast } = useToast()
  const t = useTranslations('products.product')
  const tc = useTranslations('common.currency')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Calculate average rating
  const averageRating = product.reviews.length
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) /
    product.reviews.length
    : 0

  const handleAddToCart = () => {
    cart.addItem({
      productId: activeProduct.id,
      name: activeProduct.name,
      price: activeProduct.price,
      image: activeProduct.images[0],
      quantity: parseInt(quantity),
    })

    toast({
      title: t('product_added'),
      description: `${quantity} x ${activeProduct.name} ${t('product_added')}`,
      action: (
        <ToastAction altText='View cart' asChild>
          <Link href={`/${locale}/cart`}>{t('view_cart')}</Link>
        </ToastAction>
      ),
    })
  }

  const handleToggleFavorite: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault()
    if (favLoading) return
    setFavLoading(true)
    try {
      if (!favorited) {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Favorilere eklenemedi')
        setFavorited(true)
        toast({ title: 'Favorilere eklendi' })
      } else {
        const res = await fetch(`/api/favorites/${product.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Favorilerden kaldırılamadı')
        setFavorited(false)
        toast({ title: 'Favorilerden kaldırıldı' })
      }
    } catch (error: any) {
      const message = error?.message || 'İşlem başarısız'
      toast({ variant: 'destructive', title: 'Hata', description: message })
    } finally {
      setFavLoading(false)
    }
  }

  const handleShare: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault()
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.description, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Bağlantı kopyalandı' })
      } else {
        toast({ title: 'Paylaşım desteklenmiyor', description: url })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Paylaşım iptal edildi' })
    }
  }

  // Initialize active variant from URL query (?variant=<id>) for shareable links
  useEffect(() => {
    try {
      const vid = searchParams.get('variant')
      
      // If no variant in URL, reset to base product
      if (!vid) {
        setActiveProduct(prev => {
          // Only update if currently not the base product
          if (prev.id !== product.id) {
            return {
              id: product.id,
              name: product.name,
              price: product.price,
              stock: product.stock,
              images: product.images,
            }
          }
          return prev
        })
        return
      }
      
      if (!Array.isArray(variants) || variants.length === 0) return
      const found = variants.find(v => v.id === vid)
      if (!found) return
      
      // Only update if the variant is different from current active product
      setActiveProduct(prev => {
        if (prev.id !== found.id) {
          return {
            id: found.id,
            name: found.name,
            price: found.price,
            stock: found.stock,
            images: found.images,
          }
        }
        return prev
      })
      
      if (onVariantChange) {
        try { onVariantChange(found) } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    // We intentionally depend on searchParams and variants to react to URL changes
  }, [searchParams, variants, onVariantChange, product.id, product.name, product.price, product.stock, product.images])

  const { displayCurrency, convert } = useCurrency()
  const vatRate = typeof vatRateProp === 'number' ? vatRateProp : 0.1
  const showInclVat = !!showInclVatProp


  const displayPrice = useMemo(() => {
    const base = activeProduct.price
    const raw = showInclVat ? base * (1 + vatRate) : base
    return convert(raw)
  }, [convert, activeProduct.price, showInclVat, vatRate])

  const displayOriginalPrice = useMemo(() => {
    const base = typeof activeProduct.originalPrice === 'number' ? activeProduct.originalPrice : null
    if (base === null || base <= 0) return null
    const raw = showInclVat ? base * (1 + vatRate) : base
    return convert(raw)
  }, [convert, activeProduct.originalPrice, showInclVat, vatRate])

  const hasOriginalHigher = typeof activeProduct.originalPrice === 'number' && activeProduct.originalPrice > activeProduct.price

  // Build display name: base product name (already locale-aware from API)
  // and append active variant label when a different variant is selected
  const stripBasePrefix = (name?: string, baseName?: string) => {
    const n = (name || '').trim()
    const b = (baseName || '').trim()
    if (!n || !b) return n
    const esc = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`^\\s*${esc}\\s*[-–—:|]\\s*`, 'i')
    const out = n.replace(regex, '').trim()
    return out || n
  }
  const activeVariantLabel = useMemo(() => {
    if (!Array.isArray(variants) || variants.length === 0) return null
    if (activeProduct.id === product.id) return null
    const found = variants.find(v => v.id === activeProduct.id)
    if (!found) return null
    const cleanedOption = stripBasePrefix(found.optionLabel || '', product.name)
    const cleanedName = stripBasePrefix(found.name, product.name)
    const candidate = (cleanedOption && cleanedOption.trim()) ? cleanedOption.trim() : cleanedName.trim()
    return candidate || null
  }, [variants, activeProduct.id, product.id, product.name])

  // Helper to strip a trailing variant suffix (e.g., " - Metalik") from base product name
  const stripVariantSuffix = (base: string, label?: string | null) => {
    const b = (base || '').trim()
    const l = (label || '').trim()
    if (!b || !l) return b
    const esc = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\n?\s*[\-–—:|]\s*${esc}\s*$`, 'i')
    const out = b.replace(regex, '').trim()
    return out || b
  }

  // Determine the base variant label for the primary product (used to strip from title when switching variants)
  const baseVariantLabel = useMemo(() => {
    if (!Array.isArray(variants) || variants.length === 0) return null
    const baseVariant = variants.find(v => v.id === product.id)
    if (!baseVariant) return null
    const cleanedOption = stripBasePrefix(baseVariant.optionLabel || '', product.name)
    const cleanedName = stripBasePrefix(baseVariant.name, product.name)
    const label = (cleanedOption && cleanedOption.trim()) ? cleanedOption.trim() : cleanedName.trim()
    return label || null
  }, [variants, product.id, product.name])

  // Display the currently active product's full name (variant or base)
  const displayProductName = useMemo(() => {
    return (activeProduct?.name || product.name)
  }, [activeProduct?.name, product.name])

  return (
    <div className='space-y-6 '>
      <div>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-balance text-3xl font-semibold leading-tight text-foreground'>{displayProductName}</h1>
          {/* <FavoriteButton productId={product.id} initialFavorited={initialFavorited} /> */}
        </div>
        <div className='flex items-center gap-2 mt-2'>
          <div className='flex'>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= averageRating
                  ? 'fill-primary text-primary'
                  : 'fill-muted text-muted'
                  }`}
              />
            ))}
          </div>
          <span className='text-muted-foreground'>
            ({product.reviews.length} {t('reviews')})
          </span>
        </div>
      </div>

      <div className='text-4xl gap-3 font-bold text-foreground'>

        <span className="text-4xl me-3 font-bold text-foreground">
          {formatCurrency(displayPrice, displayCurrency, locale)}
        </span>
        {hasOriginalHigher && displayOriginalPrice !== null && (
          <span className='mr-3 text-2xl font-normal text-muted-foreground line-through'>
            {formatCurrency(displayOriginalPrice, displayCurrency, locale)}
          </span>
        )}
        {!showInclVat && (
          <span className='ml-2 text-sm text-muted-foreground'>{tc('excl_vat_suffix')}</span>
        )}
        {showInclVat && (
          <div className='text-sm text-muted-foreground'>{t('incl_vat_label')}</div>
        )}
      </div>


      <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
        {activeProduct.stock > 0 ? (
          <>
            <Check className="h-5 w-5 text-secondary-foreground" />
            <span className='text-sm font-medium text-secondary-foreground'>{t('stock_available_count', { count: activeProduct.stock })}</span>
          </>) : (
          <>
            <Cross className="h-5 w-5 text-accent" />
            <span className='text-sm font-medium'>{t('out_of_stock')}</span></>
        )}
      </div>

      <div className='space-y-4'>
        {Array.isArray(variants) && variants.length > 0 && (
          <div>
            <div className='text-sm font-medium mb-2'>{variantLabel || t('select_variant')}</div>
            <Select value={activeProduct.id} onValueChange={(val) => {
              // Prevent unnecessary updates if selecting the same variant
              if (val === activeProduct.id) return
              
              const found = variants.find(v => v.id === val)
              if (found) {
                setActiveProduct({
                  id: found.id,
                  // Keep product-specific fields; display title is computed from base name + label
                  name: found.name,
                  price: found.price,
                  stock: found.stock,
                  images: found.images,
                })
                if (onVariantChange) {
                  try { onVariantChange(found) } catch { /* ignore */ }
                }
                // Update URL query for shareable variant links
                try {
                  const params = new URLSearchParams(searchParams.toString())
                  if (found.id === product.id) {
                    params.delete('variant')
                  } else {
                    params.set('variant', found.id)
                  }
                  const qs = params.toString()
                  const href = qs ? `${pathname}?${qs}` : pathname
                  // Next.js navigation
                  router.replace(href, { scroll: false })
                  // Fallback: ensure address bar updates even if router is ignored
                  try {
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', href)
                    }
                  } catch { /* ignore */ }
                } catch { /* ignore */ }
              }
            }}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t('select_variant')} />
              </SelectTrigger>
              <SelectContent>
                {/* Base product option - show its variant label if available */}
                <SelectItem key={product.id} value={product.id}>
                  {(() => {
                    // Find base product in variants array to get its optionLabel
                    const baseVariant = variants.find(v => v.id === product.id)
                    if (baseVariant) {
                      const cleanedOption = stripBasePrefix(baseVariant.optionLabel || '', product.name)
                      const cleanedName = stripBasePrefix(baseVariant.name, product.name)
                      const label = (cleanedOption && cleanedOption.trim()) ? cleanedOption.trim() : cleanedName.trim()
                      return label || 'Varsayılan'
                    }
                    return 'Varsayılan'
                  })()}
                </SelectItem>
                {variants.filter(v => v.id !== product.id).map((v) => {
                  const cleanedOption = stripBasePrefix(v.optionLabel || '', product.name)
                  const cleanedName = stripBasePrefix(v.name, product.name)
                  const label = (cleanedOption && cleanedOption.trim()) ? cleanedOption.trim() : cleanedName.trim()
                  return (
                    <SelectItem key={v.id} value={v.id}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <div className='text-sm font-medium mb-2'>{t('quantity')}</div>
          <Select value={quantity} onValueChange={setQuantity}>
            <SelectTrigger className='w-24'>
              <SelectValue placeholder={t('select_quantity')} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(10, activeProduct.stock) }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAddToCart}
          className='w-full py-6 font-bold text-lg'
          disabled={activeProduct.stock === 0}
        > <Plus />
          {t('add_to_cart')}
        </Button>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            className='flex-1 h-12'
            size='lg'
            onClick={handleToggleFavorite}
            disabled={favLoading}
          >
            <Heart
              className={`mr-2 ${favorited ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground'}`}
            />
            {favorited ? t('remove_from_favorites') : t('add_to_favorites')}
          </Button>
          <Button
            variant='outline'
            className='flex-1 h-12'
            size='lg'
            onClick={handleShare}
          >
            <Share className='mr-2' />
            {t('share')}
          </Button>
        </div>

        {promoTexts.length > 0 && (
          <div className='mt-3 rounded-lg border p-3 space-y-3'>
            {promoTexts.map((text, idx) => (
              <div key={idx} className='flex items-start gap-3'>
                <div className='flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground shrink-0'>
                  <Info className='h-4 w-4' />
                </div>
                <div className='text-sm'>{text}</div>
              </div>
            ))}
          </div>
        )}

      </div>
      {/* <div className='prose prose-sm'>
        <p>{product.description}</p>
      </div> */}
    </div>
  )
}
