import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { findBlogCover } from '@/lib/blog-cover-selector'

async function main() {
  const posts = await prisma.blogPost.findMany({
    include: { translations: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  })

  const used = new Set<string>()

  for (const post of posts) {
    const tr = post.translations.find((translation) => translation.locale === 'tr')
    const en = post.translations.find((translation) => translation.locale === 'en')
    const title = [tr?.title, en?.title].filter(Boolean).join(' ') || post.slug
    const excerpt = [tr?.excerpt, en?.excerpt].filter(Boolean).join(' ') || null

    const match = await findBlogCover({
      title,
      excerpt,
      excludeImages: [...used],
    })

    if (!match) {
      console.log(`· ${post.slug}: uygun ürün görseli yok, mevcut kapak korunuyor`)
      continue
    }

    used.add(match.image)
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { coverImage: match.image },
    })
    console.log(`✓ ${post.slug}: ${match.productName} (${match.score})`)
  }
}

main()
  .catch((error) => {
    console.error('Kapak atama hatası:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
