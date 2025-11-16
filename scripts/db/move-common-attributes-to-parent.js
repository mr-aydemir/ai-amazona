const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resolveParentCategoryId(args) {
  const parentIdArg = getArg(args, '--parentId=')
  const parentSlugArg = getArg(args, '--parentSlug=')
  const parentNameArg = getArg(args, '--parentName=')
  if (parentIdArg) return parentIdArg
  let where = {}
  if (parentSlugArg) {
    where = { slug: parentSlugArg }
  } else if (parentNameArg) {
    where = {
      OR: [
        { name: parentNameArg },
        { translations: { some: { name: parentNameArg } } },
      ],
    }
  } else {
    where = {
      OR: [
        { slug: '3d-baski' },
        { name: '3D Baskı' },
        { translations: { some: { locale: 'tr', name: '3D Baskı' } } },
      ],
    }
  }
  const c = await prisma.category.findFirst({ where, select: { id: true, name: true, slug: true } })
  if (!c) throw new Error('Parent category not found. Provide --parentId=, --parentSlug=, or --parentName=')
  return c.id
}

function getArg(args, prefix) {
  const hit = args.find((a) => a.startsWith(prefix))
  return hit ? hit.substring(prefix.length) : null
}

async function getDescendants(parentId) {
  const ids = new Set([parentId])
  const queue = [parentId]
  while (queue.length) {
    const cur = queue.shift()
    const children = await prisma.category.findMany({ where: { parentId: cur }, select: { id: true } })
    for (const ch of children) {
      if (!ids.has(ch.id)) {
        ids.add(ch.id)
        queue.push(ch.id)
      }
    }
  }
  ids.delete(parentId)
  return Array.from(ids)
}

async function fetchAttributesByCategories(categoryIds) {
  if (!categoryIds.length) return []
  return prisma.attribute.findMany({
    where: { categoryId: { in: categoryIds }, active: true },
    select: { id: true, categoryId: true, key: true, type: true, unit: true, sortOrder: true, isRequired: true },
    orderBy: { sortOrder: 'asc' },
  })
}

function groupByKeyAndType(attrs) {
  const map = new Map()
  for (const a of attrs) {
    const k = `${a.key}::${a.type}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(a)
  }
  return map
}

async function ensureCanonicalInParent(key, type, parentId) {
  const existing = await prisma.attribute.findFirst({ where: { categoryId: parentId, key, type } })
  if (existing) return existing
  return null
}

async function upsertOptionOnCanonical(fromOptionId, canonicalAttrId) {
  const fromOpt = await prisma.attributeOption.findUnique({
    where: { id: fromOptionId },
    include: { translations: true },
  })
  if (!fromOpt) return null
  const key = fromOpt.key || null
  let target = null
  if (key) {
    target = await prisma.attributeOption.findFirst({ where: { attributeId: canonicalAttrId, key } })
  }
  if (!target) {
    target = await prisma.attributeOption.create({
      data: { attributeId: canonicalAttrId, key, sortOrder: fromOpt.sortOrder, active: fromOpt.active },
    })
    if (fromOpt.translations?.length) {
      await prisma.attributeOptionTranslation.createMany({
        data: fromOpt.translations.map((t) => ({ attributeOptionId: target.id, locale: t.locale, name: t.name })),
        skipDuplicates: true,
      })
    }
  }
  return target
}

async function migrateAttributeValues(fromAttrId, canonicalAttrId, type) {
  const values = await prisma.productAttributeValue.findMany({
    where: { attributeId: fromAttrId },
    select: { id: true, productId: true, attributeOptionId: true, valueText: true, valueNumber: true, valueBoolean: true },
  })
  for (const v of values) {
    const exists = await prisma.productAttributeValue.findFirst({ where: { productId: v.productId, attributeId: canonicalAttrId } })
    if (exists) {
      // A product already has value for canonical, skip and delete old row
      await prisma.productAttributeValue.delete({ where: { id: v.id } })
      continue
    }
    let newOptionId = null
    if (type === 'SELECT' && v.attributeOptionId) {
      const targetOpt = await upsertOptionOnCanonical(v.attributeOptionId, canonicalAttrId)
      newOptionId = targetOpt ? targetOpt.id : null
    }
    await prisma.productAttributeValue.update({
      where: { id: v.id },
      data: {
        attributeId: canonicalAttrId,
        attributeOptionId: newOptionId,
      },
    })
  }
}

async function deactivateAndCleanupAttribute(attrId) {
  // Mark inactive to avoid accidental usage
  await prisma.attribute.update({ where: { id: attrId }, data: { active: false } })
  // Optional: remove options/translations to reduce clutter
  await prisma.attributeTranslation.deleteMany({ where: { attributeId: attrId } })
  await prisma.attributeOptionTranslation.deleteMany({ where: { option: { attributeId: attrId } } }).catch(() => {})
  await prisma.attributeOption.deleteMany({ where: { attributeId: attrId } })
  await prisma.attribute.delete({ where: { id: attrId } }).catch(() => {})
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const parentId = await resolveParentCategoryId(args)
  const descendants = await getDescendants(parentId)
  if (!descendants.length) {
    console.log('No descendant categories found for parent:', parentId)
    return
  }
  const attrs = await fetchAttributesByCategories(descendants)
  const byKeyType = groupByKeyAndType(attrs)
  const plan = []

  for (const [keyType, list] of byKeyType.entries()) {
    if (list.length < 2) continue
    const [key, type] = keyType.split('::')
    const canonicalExisting = await ensureCanonicalInParent(key, type, parentId)
    let canonical = canonicalExisting
    let canonicalWasMoved = false
    if (!canonical) {
      canonical = list[0]
      if (apply) {
        try {
          await prisma.attribute.update({ where: { id: canonical.id }, data: { categoryId: parentId } })
        } catch (e) {
          if (e && e.code === 'P2002') {
            const existing = await prisma.attribute.findFirst({ where: { categoryId: parentId, key, type } })
            if (existing) {
              canonical = existing
            } else {
              // fallback: use same key regardless of type if present
              const byKey = await prisma.attribute.findFirst({ where: { categoryId: parentId, key } })
              if (byKey) canonical = byKey
              else throw e
            }
          } else {
            throw e
          }
        }
        canonicalWasMoved = true
      }
    }
    const others = canonicalExisting ? list : list.slice(1)
    plan.push({ key, type, canonicalId: canonical.id, moveCanonicalToParent: !canonicalExisting, countToMerge: others.length })
    if (!apply) continue
    for (const a of others) {
      if (a.id === canonical.id) continue
      await migrateAttributeValues(a.id, canonical.id, type)
      await deactivateAndCleanupAttribute(a.id)
    }
  }

  console.log(JSON.stringify({ parentId, mergedKeys: plan }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })