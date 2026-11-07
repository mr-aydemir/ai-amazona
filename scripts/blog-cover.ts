import fs from 'node:fs/promises'
import path from 'node:path'
import { renderBlogCoverSvg } from '../src/lib/blog-cover-svg'

export async function writeBlogCover(
  slug: string,
  title: string,
  index: number
): Promise<string> {
  const svg = renderBlogCoverSvg(title, index)
  const dir = path.join(process.cwd(), 'public', 'images', 'blog')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${slug}.svg`), svg, 'utf8')

  return `/images/blog/${slug}.svg`
}
