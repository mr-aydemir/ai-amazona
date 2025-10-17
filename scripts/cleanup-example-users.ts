#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

function parseFlag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(name + '='))
  return match ? match.split('=')[1] : undefined
}

function hasFlag(...names: string[]): boolean {
  return process.argv.some((arg) => names.includes(arg))
}

async function main() {
  const domainInput = parseFlag('--domain') || '@example.com'
  const domain = domainInput.startsWith('@') ? domainInput : `@${domainInput}`
  const dryRun = hasFlag('--dry-run', '-n')
  const yes = hasFlag('--yes', '-y')

  console.log(`\n[Cleanup] Hedef alan: ${domain} | Dry-run: ${dryRun ? 'EVET' : 'HAYIR'}`)

  const userWhere = { email: { endsWith: domain } }

  const users = await prisma.user.findMany({ where: userWhere, select: { id: true, email: true } })
  const userIds = users.map((u) => u.id)

  if (users.length === 0) {
    console.log('[Cleanup] Bu alanla biten kullanıcı bulunamadı.')
    return
  }

  console.log(`[Cleanup] Etkilenecek kullanıcı sayısı: ${users.length}`)

  const [
    orderCount,
    orderItemCount,
    cartCount,
    cartItemCount,
    addressCount,
    savedCardCount,
    reviewCount,
    favoriteCount,
    notificationCount,
    accountCount,
    sessionCount,
  ] = await Promise.all([
    prisma.order.count({ where: { userId: { in: userIds } } }),
    prisma.orderItem.count({ where: { order: { userId: { in: userIds } } } }),
    prisma.cart.count({ where: { userId: { in: userIds } } }),
    prisma.cartItem.count({ where: { cart: { userId: { in: userIds } } } }),
    prisma.address.count({ where: { userId: { in: userIds } } }),
    prisma.savedCard.count({ where: { userId: { in: userIds } } }),
    prisma.review.count({ where: { userId: { in: userIds } } }),
    prisma.favorite.count({ where: { userId: { in: userIds } } }),
    prisma.notification.count({ where: { userId: { in: userIds } } }),
    prisma.account.count({ where: { userId: { in: userIds } } }),
    prisma.session.count({ where: { userId: { in: userIds } } }),
  ])

  console.log('[Cleanup] Özet:')
  console.log(`  Siparişler:        ${orderCount}`)
  console.log(`  Sipariş ürünleri:  ${orderItemCount}`)
  console.log(`  Sepetler:          ${cartCount}`)
  console.log(`  Sepet ürünleri:    ${cartItemCount}`)
  console.log(`  Adresler:          ${addressCount}`)
  console.log(`  Kayıtlı kartlar:   ${savedCardCount}`)
  console.log(`  Yorumlar:          ${reviewCount}`)
  console.log(`  Favoriler:         ${favoriteCount} (kullanıcı silinince cascade)`)
  console.log(`  Bildirimler:       ${notificationCount} (kullanıcı silinince cascade)`)
  console.log(`  Hesaplar:          ${accountCount} (kullanıcı silinince cascade)`)
  console.log(`  Oturumlar:         ${sessionCount} (kullanıcı silinince cascade)`)

  if (dryRun) {
    console.log('\n[Cleanup] Dry-run modunda; hiçbir veri silinmedi.')
    return
  }

  if (!yes) {
    console.log("\n[Cleanup] Gerçek silme için '--yes' veya '-y' bayrağını ekleyin.")
    return
  }

  console.log('\n[Cleanup] Silme işlemi başlatılıyor...')

  await prisma.$transaction(async (tx) => {
    // 1) Sipariş bağımlılıkları
    if (orderItemCount > 0) {
      await tx.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } })
    }
    if (orderCount > 0) {
      await tx.order.deleteMany({ where: { userId: { in: userIds } } })
    }

    // 2) Sepet bağımlılıkları
    if (cartItemCount > 0) {
      await tx.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } })
    }
    if (cartCount > 0) {
      await tx.cart.deleteMany({ where: { userId: { in: userIds } } })
    }

    // 3) Doğrudan kullanıcıya bağlı kayıtlar
    if (addressCount > 0) {
      await tx.address.deleteMany({ where: { userId: { in: userIds } } })
    }
    if (savedCardCount > 0) {
      await tx.savedCard.deleteMany({ where: { userId: { in: userIds } } })
    }

    // 4) Yorumları kopar (ürün geçmişi kalsın, kullanıcı bağını kaldır)
    if (reviewCount > 0) {
      await tx.review.updateMany({ where: { userId: { in: userIds } }, data: { userId: null } })
    }

    // 5) Kullanıcıları sil (Account/Session/Notification/Favorite cascade ile gider)
    await tx.user.deleteMany({ where: { id: { in: userIds } } })
  })

  console.log('[Cleanup] Silme işlemi tamamlandı.')
}

main()
  .catch((err) => {
    console.error('[Cleanup] Hata:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })