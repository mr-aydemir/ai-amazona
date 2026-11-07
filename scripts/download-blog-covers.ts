import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, coverImage: true },
  })

  for (const post of posts) {
    if (!post.coverImage || !/^https?:\/\//.test(post.coverImage)) continue

    try {
      const response = await fetch(post.coverImage)
      if (!response.ok) {
        console.log(`· ${post.slug}: görsel alınamadı (${response.status})`)
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'images', 'blog')
      await fs.mkdir(dir, { recursive: true })

      const fileName = `${post.slug}.webp`
      await sharp(buffer)
        .resize(1200, 675, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toFile(path.join(dir, fileName))

      await prisma.blogPost.update({
        where: { id: post.id },
        data: { coverImage: `/images/blog/${fileName}` },
      })

      console.log(`✓ ${post.slug} → ${fileName}`)
    } catch (error) {
      console.error(`✗ ${post.slug}:`, error)
    }
  }
}

main()
  .catch((error) => {
    console.error('Kapak indirme hatası:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
