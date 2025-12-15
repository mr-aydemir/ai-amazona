"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Ticket, Settings, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react"

export default function CouponHowItWorks() {
  const [open, setOpen] = useState(true)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Nasıl Çalışır?</div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>{open ? "Kapat" : "Göster"}</Button>
      </div>
      {open && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div>• Kupon oluşturun ve indirim tipini seçin (Tutar/Yüzde/BOGO).</div>
                <div>• Kural ekleyin: kategori/ürün/sepet toplamı, eşikler ve bağlayıcılar.</div>
                <div>• Müşteri sepette kupon kodu uygular, indirim hesaplanır.</div>
                <div>• Ödeme başarılı olduğunda kullanım kaydı oluşur.</div>
              </div>
              <div className="flex items-center justify-center">
                <svg width="420" height="140" viewBox="0 0 420 140" className="max-w-full">
                  <rect x="10" y="20" width="90" height="40" rx="8" fill="#EEF2FF" stroke="#6366F1" />
                  <rect x="120" y="20" width="90" height="40" rx="8" fill="#ECFDF5" stroke="#10B981" />
                  <rect x="230" y="20" width="90" height="40" rx="8" fill="#FFF7ED" stroke="#F59E0B" />
                  <rect x="340" y="20" width="90" height="40" rx="8" fill="#F5F3FF" stroke="#8B5CF6" />
                  <rect x="175" y="85" width="120" height="40" rx="8" fill="#F0F9FF" stroke="#0EA5E9" />
                  <path d="M100 40 L115 40" stroke="#64748B" strokeWidth="2" />
                  <path d="M210 40 L225 40" stroke="#64748B" strokeWidth="2" />
                  <path d="M320 40 L335 40" stroke="#64748B" strokeWidth="2" />
                  <path d="M260 60 L235 85" stroke="#64748B" strokeWidth="2" />
                  <text x="55" y="45" fontSize="11" fill="#111827" textAnchor="middle">Kupon</text>
                  <text x="165" y="45" fontSize="11" fill="#111827" textAnchor="middle">Kurallar</text>
                  <text x="275" y="45" fontSize="11" fill="#111827" textAnchor="middle">Sepet</text>
                  <text x="385" y="45" fontSize="11" fill="#111827" textAnchor="middle">Checkout</text>
                  <text x="235" y="110" fontSize="11" fill="#111827" textAnchor="middle">Redemption</text>
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3 text-xs">
              <div className="flex items-center gap-2"><Ticket className="h-4 w-4" /><span>Oluştur</span></div>
              <div className="flex items-center gap-2"><Settings className="h-4 w-4" /><span>Kural</span></div>
              <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /><span>Sepet</span></div>
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span>Ödeme</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><span>Kayıt</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

