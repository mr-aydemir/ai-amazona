import { prisma } from '@/lib/prisma'

export type CartItemInput = { productId: string; categoryId: string; price: number; quantity: number }
export type CartInput = { items: CartItemInput[]; currency?: string }

export async function validateCoupon(code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() }, include: { rules: true } })
  if (!coupon) return { ok: false, error: 'Kupon bulunamadı' }
  const now = new Date()
  if (coupon.status !== 'ACTIVE') return { ok: false, error: 'Kupon aktif değil' }
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: 'Kupon başlangıç tarihinden önce' }
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: 'Kupon süresi doldu' }
  return { ok: true, coupon }
}

export function applyAmountOrPercent(coupon: any, cart: CartInput) {
  const rules = Array.isArray(coupon.rules) ? coupon.rules : []
  if (rules.length === 0) return { discount: 0 }
  const groups = new Map<number, any[]>()
  for (const r of rules) {
    const g = typeof r.group === 'number' ? r.group : 1
    const arr = groups.get(g) || []
    arr.push(r)
    groups.set(g, arr)
  }
  const subtotal = cart.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const unionSet = new Set<number>()
  let scopeTotal = 0
  const groupResults: number[] = []
  groups.forEach((grRules, gnum) => {
    const op = (grRules[0]?.groupOp as 'AND' | 'OR') || 'OR'
    // Collect matching item indices per rule
    const perRuleSets = grRules.map((r: any) => {
      if (r.scopeType === 'CART_TOTAL') {
        // CART_TOTAL uses full subtotal, but for set ops return all indices
        const indices = cart.items.flatMap((it, idx) => Array(it.quantity).fill(idx))
        return { indices: new Set(indices), amount: subtotal }
      }
      let matched: number[] = []
      cart.items.forEach((it, idx) => {
        const okCat = r.scopeType === 'CATEGORY' && r.scopeValueId && it.categoryId === r.scopeValueId
        const okProd = r.scopeType === 'PRODUCT' && r.scopeValueId && it.productId === r.scopeValueId
        if (okCat || okProd) {
          for (let q = 0; q < it.quantity; q++) matched.push(idx)
        }
      })
      const set = new Set(matched)
      const amount = matched.reduce((s, idx) => s + cart.items[idx].price, 0)
      return { indices: set, amount }
    })
    let indices: Set<number>
    if (op === 'AND') {
      // Intersect indices across rules
      indices = perRuleSets.reduce((acc, cur) => {
        const next = new Set<number>()
        acc.forEach((i) => { if (cur.indices.has(i)) next.add(i) })
        return next
      }, perRuleSets[0]?.indices || new Set<number>())
    } else {
      // Union
      indices = perRuleSets.reduce((acc, cur) => {
        cur.indices.forEach((i) => acc.add(i)); return acc
      }, new Set<number>())
    }
    // Check minQty/minAmount constraints (AND semantics: all rules must pass)
    const rulesPass = grRules.every((r: any) => {
      const qty = indices.size
      const amt = Array.from(indices).reduce((s, idx) => s + cart.items[idx].price, 0)
      if (typeof r.minQty === 'number' && qty < r.minQty) return false
      if (typeof r.minAmount === 'number' && amt < r.minAmount) return false
      return true
    })
    if (!rulesPass) { groupResults.push(0); return }
    const amt = Array.from(indices).reduce((s, idx) => s + cart.items[idx].price, 0)
    groupResults.push(amt)
  })
  // Combine groups by OR (take union of items effectively via sum of unique indices)
  // Simplify: use max group amount to avoid double counting
  scopeTotal = Math.max(0, ...groupResults)
  if (scopeTotal <= 0) return { discount: 0 }
  let discount = 0
  if (coupon.discountType === 'AMOUNT') {
    discount = coupon.amountFixed || 0
  } else if (coupon.discountType === 'PERCENT') {
    const pct = (coupon.amountPercent || 0) / 100
    discount = scopeTotal * pct
  }
  if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount
  return { discount }
}

export function applyBogo(coupon: any, cart: CartInput) {
  const rules = Array.isArray(coupon.rules) ? coupon.rules : []
  if (rules.length === 0) return { discount: 0 }
  const groups = new Map<number, any[]>()
  for (const r of rules) {
    const g = typeof r.group === 'number' ? r.group : 1
    const arr = groups.get(g) || []
    arr.push(r)
    groups.set(g, arr)
  }
  const discounts: number[] = []
  groups.forEach((grRules) => {
    // Only consider BOGO rules in group
    const bogo = grRules.find((r: any) => r.bogoBuyQty && r.bogoGetQty)
    if (!bogo) { discounts.push(0); return }
    let items = cart.items
    if (bogo.scopeType === 'CATEGORY' && bogo.scopeValueId) items = items.filter((it) => it.categoryId === bogo.scopeValueId)
    if (bogo.scopeType === 'PRODUCT' && bogo.scopeValueId) items = items.filter((it) => it.productId === bogo.scopeValueId)
    const buy = bogo.bogoBuyQty || 0
    const get = bogo.bogoGetQty || 0
    const totalQty = items.reduce((s, it) => s + it.quantity, 0)
    if (totalQty < buy) { discounts.push(0); return }
    const freeCount = Math.floor(totalQty / buy) * get
    if (freeCount <= 0) { discounts.push(0); return }
    const unitPrices: number[] = []
    for (const it of items) for (let i = 0; i < it.quantity; i++) unitPrices.push(it.price)
    unitPrices.sort((a, b) => a - b)
    const d = unitPrices.slice(0, freeCount).reduce((s, p) => s + p, 0)
    discounts.push(d)
  })
  const discount = Math.max(0, ...discounts)
  return { discount }
}
