const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📝 Seeding promo texts...')
  const count = await prisma.promoText.count()
  if (count > 0) {
    console.log(`ℹ️ Promo texts already exist (${count}), skipping.`)
    return
  }

  const samples = [
    {
      sortOrder: 1,
      active: true,
      translations: {
        create: [
          { locale: 'tr', text: '1000 TL üzeri siparişlerde kargo bedava' },
          { locale: 'en', text: 'Free shipping on orders over 1000 TL' },
        ],
      },
    },
    {
      sortOrder: 2,
      active: true,
      translations: {
        create: [
          { locale: 'tr', text: "Sezon indirimleri başladı! %50'ye varan fırsatlar" },
          { locale: 'en', text: 'Season sale started! Up to 50% off' },
        ],
      },
    },
  ]

  for (const data of samples) {
    await prisma.promoText.create({ data })
  }

  console.log('✅ Promo texts seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })