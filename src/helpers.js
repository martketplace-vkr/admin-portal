export const emptyProfile = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  avatarUrl: '',
}

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function toText(value) {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

export function normalizeProfile(profile) {
  return {
    id: toText(profile?.id),
    email: toText(profile?.email),
    firstName: toText(profile?.firstName ?? profile?.first_name),
    lastName: toText(profile?.lastName ?? profile?.last_name),
    avatarUrl: toText(profile?.avatarUrl ?? profile?.avatar_url),
  }
}

export function flattenCategories(categories, depth = 0) {
  return (categories || []).flatMap((category) => {
    const option = {
      value: toText(category?.id),
      label: `${'  '.repeat(depth)}${toText(category?.name)}`,
    }

    return [option, ...flattenCategories(category?.children, depth + 1)]
  })
}

export function getProductId(product) {
  return toText(product?.id ?? product?.productId)
}

export function getVendorId(product) {
  return toText(product?.vendorId ?? product?.vendor_id)
}

export function getCategoryId(product) {
  return toText(product?.categoryId ?? product?.category_id)
}

export function getProductName(product) {
  return toText(product?.name)
}

export function getProductDescription(product) {
  return toText(product?.description)
}

export function getProductPrice(product) {
  return toText(product?.price)
}

export function getStockCount(product) {
  return toText(product?.stockCount ?? product?.stock_count)
}

export function getProductImages(product) {
  return Array.isArray(product?.images) ? product.images : []
}

export function getProductAttributes(product) {
  return Array.isArray(product?.attributes) ? product.attributes : []
}

export function getProductUpdatedAt(product) {
  return toText(product?.updatedAt ?? product?.updated_at ?? product?.createdAt ?? product?.created_at)
}

export function parsePriceValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const normalized = toText(value).replace(/\s+/g, '').replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)

  if (!match) {
    return 0
  }

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatPrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return rubFormatter.format(value)
  }

  const parsed = parsePriceValue(value)
  if (parsed > 0) {
    return rubFormatter.format(parsed)
  }

  const normalized = toText(value).trim()
  return normalized || 'Цена не указана'
}

export function formatUSDTPrice(value) {
  const parsed = parsePriceValue(value)
  if (parsed > 0 || parsed === 0) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(parsed)} USDT`
  }

  const normalized = toText(value).trim()
  return normalized || 'Цена не указана'
}

export function formatDateTime(value) {
  const normalized = toText(value).trim()
  if (!normalized) {
    return 'Нет даты'
  }

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return 'Нет даты'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getProductStatus(product) {
  const stockCount = Number.parseInt(getStockCount(product), 10)

  if (!Number.isInteger(stockCount) || stockCount <= 0) {
    return 'out'
  }

  if (stockCount <= 5) {
    return 'low'
  }

  return 'ok'
}
