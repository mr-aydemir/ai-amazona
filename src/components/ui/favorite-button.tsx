'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type FavoriteButtonProps = {
  productId: string
  initialFavorited?: boolean
  className?: string
}

export function FavoriteButton({ productId, initialFavorited = false, className }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState<boolean>(initialFavorited)
  const [loading, setLoading] = useState<boolean>(false)
  const { toast } = useToast()

  const toggleFavorite: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    try {
      if (!favorited) {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Favorilere eklenemedi')
        setFavorited(true)
        toast({ title: 'Favorilere eklendi' })
      } else {
        const res = await fetch(`/api/favorites/${productId}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Favorilerden kaldırılamadı')
        setFavorited(false)
        toast({ title: 'Favorilerden kaldırıldı' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem başarısız'
      toast({ variant: 'destructive', title: 'Hata', description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className={className}
      onClick={toggleFavorite}
      aria-label={favorited ? 'Favorilerden kaldır' : 'Favorilere ekle'}
      disabled={loading}
    >
      <Heart className={`h-5 w-5 ${favorited ? 'fill-primary text-primary' : 'fill-muted text-muted-foreground'}`} />
    </Button>
  )
}