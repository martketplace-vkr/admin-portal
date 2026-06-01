import {
  getCategoryId,
  getProductAttributes,
  getProductDescription,
  getProductId,
  getProductImages,
  getProductName,
  getProductPrice,
  getProductStatus,
  getProductUpdatedAt,
  getStockCount,
  getVendorId,
  parsePriceValue,
  toText,
} from '../helpers'

export const MODERATION_STORAGE_KEY = 'marketplace.admin.moderation'

export const MODERATION_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'attention', label: 'Риски' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'review', label: 'На проверке' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
]

export const PAGE_COPY = {
  dashboard: {
    title: 'Операционный обзор',
    description: 'Платформенная статистика, очередь модерации и общая картина по каталогу.',
  },
  moderation: {
    title: 'Модерация каталога',
    description: 'Ручная проверка карточек, фиксация решений и комментариев для сотрудников платформы.',
  },
  moderationProduct: {
    title: 'Карточка товара',
    description: 'Детальная проверка карточки товара и решение модератора.',
  },
  reviews: {
    title: 'Модерация отзывов',
    description: 'Спорные отзывы, исключение оценок из рейтинга и удаление нарушений.',
  },
  payments: {
    title: 'Платежи',
    description: 'Подтверждение тестовых RUB пополнений через mock-провайдера.',
  },
  accounts: {
    title: 'Счета',
    description: 'Системный кошелек маркетплейса и балансы вендоров.',
  },
  orders: {
    title: 'Заказы',
    description: 'Агрегация по номеру, вендору и статусу, контроль оплаты.',
  },
  tariffs: {
    title: 'Тарифы',
    description: 'Комиссии маркетплейса, дефолтный тариф и назначения вендорам.',
  },
  categories: {
    title: 'Категории',
    description: 'Создание корневых категорий и подкатегорий для витрины.',
  },
  vendors: {
    title: 'Срез по вендорам',
    description: 'Агрегация каталога по vendor_id с рисками, очередью и плотностью наполнения.',
  },
  vendorProfile: {
    title: 'Профиль вендора',
    description: 'Детальная карточка владельца каталога, товары и риски.',
  },
  profile: {
    title: 'Профиль сотрудника',
    description: 'Данные текущего staff-аккаунта и контекст backend-интеграции.',
  },
  notFound: {
    title: 'Раздел не найден',
    description: 'Такого маршрута в staff-консоли нет.',
    buttonLabel: 'Вернуться в обзор',
  },
}

export const LOADING_COPY = {
  eyebrow: 'platform admin',
  description: 'Проверяем сессию сотрудника, профиль и платформенный каталог.',
}

export function buildStats(products) {
  const totalProducts = products.length
  const totalStock = products.reduce((sum, product) => sum + toSafeInteger(getStockCount(product)), 0)
  const inventoryValue = products.reduce(
    (sum, product) => sum + parsePriceValue(getProductPrice(product)) * toSafeInteger(getStockCount(product)),
    0,
  )
  const lowStockCount = products.filter((product) => getProductStatus(product) === 'low').length
  const outOfStockCount = products.filter((product) => getProductStatus(product) === 'out').length
  const healthyStockCount = products.filter((product) => getProductStatus(product) === 'ok').length
  const categoriesCount = new Set(products.map((product) => getCategoryId(product)).filter(Boolean)).size

  return {
    totalProducts,
    totalStock,
    inventoryValue,
    lowStockCount,
    outOfStockCount,
    healthyStockCount,
    categoriesCount,
  }
}

export function buildAdminStats(products, moderationQueue) {
  const baseStats = buildStats(products)
  const vendorSet = new Set(moderationQueue.map((item) => item.vendorId))

  return {
    ...baseStats,
    totalVendors: vendorSet.size,
    attentionCount: moderationQueue.filter((item) => item.attention).length,
    pendingCount: moderationQueue.filter((item) => item.decision === 'pending').length,
    reviewCount: moderationQueue.filter((item) => item.decision === 'review').length,
    approvedCount: moderationQueue.filter((item) => item.decision === 'approved').length,
    rejectedCount: moderationQueue.filter((item) => item.decision === 'rejected').length,
  }
}

export function buildModerationBuckets(stats) {
  return [
    { label: 'Одобрено', value: stats.approvedCount, tone: 'accent' },
    { label: 'На проверке', value: stats.pendingCount + stats.reviewCount, tone: 'warning' },
    { label: 'Отклонено', value: stats.rejectedCount, tone: 'danger' },
  ]
}

export function buildModerationQueue(products, moderationState, categoryLabelById) {
  return [...products]
    .map((product) => {
      const productId = getProductId(product)
      const vendorId = normalizeVendorKey(getVendorId(product))
      const moderationRecord = moderationState[productId] || null
      const quality = buildProductQuality(product)
      const decision = toText(moderationRecord?.status) || 'pending'
      const categoryId = getCategoryId(product)

      return {
        product,
        productId,
        vendorId,
        vendorLabel: quality.vendorLabel,
        decision,
        note: toText(moderationRecord?.note),
        updatedAt: getProductUpdatedAt(product),
        priceNumber: parsePriceValue(getProductPrice(product)),
        imageCount: quality.imageCount,
        attributeCount: quality.attributeCount,
        flags: quality.flags,
        riskScore: quality.flags.length,
        completenessPercent: quality.completenessPercent,
        hasContentIssue: quality.hasContentIssue,
        attention: quality.flags.length > 0 || ['review', 'rejected'].includes(decision),
        searchText: [
          getProductName(product),
          getProductDescription(product),
          vendorId,
          quality.vendorLabel,
          categoryLabelById[categoryId],
          categoryId,
        ]
          .join(' ')
          .toLowerCase(),
      }
    })
    .sort(sortModerationItems)
}

export function buildVendorInsights(moderationQueue, vendorById = {}) {
  const grouped = new Map()

  for (const item of moderationQueue) {
    const vendorInfo = vendorById[item.vendorId] || null
    if (!grouped.has(item.vendorId)) {
      grouped.set(item.vendorId, {
        vendorId: item.vendorId,
        email: toText(vendorInfo?.email),
        label: buildVendorLabel(item.vendorId, vendorInfo),
        totalProducts: 0,
        totalStock: 0,
        inventoryValue: 0,
        attentionCount: 0,
        pendingCount: 0,
        reviewCount: 0,
        rejectedCount: 0,
        approvedCount: 0,
        completenessTotal: 0,
        latestUpdate: item.updatedAt,
        items: [],
      })
    }

    const group = grouped.get(item.vendorId)
    group.totalProducts += 1
    group.totalStock += toSafeInteger(getStockCount(item.product))
    group.inventoryValue += item.priceNumber * toSafeInteger(getStockCount(item.product))
    group.attentionCount += item.attention ? 1 : 0
    group.pendingCount += item.decision === 'pending' ? 1 : 0
    group.reviewCount += item.decision === 'review' ? 1 : 0
    group.rejectedCount += item.decision === 'rejected' ? 1 : 0
    group.approvedCount += item.decision === 'approved' ? 1 : 0
    group.completenessTotal += item.completenessPercent
    group.latestUpdate = compareDates(item.updatedAt, group.latestUpdate) > 0 ? item.updatedAt : group.latestUpdate
    group.items.push(item)
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      completenessPercent: Math.round(group.completenessTotal / Math.max(1, group.totalProducts)),
      items: [...group.items].sort(sortModerationItems),
    }))
    .sort((left, right) => {
      if (right.attentionCount !== left.attentionCount) {
        return right.attentionCount - left.attentionCount
      }

      if (right.totalProducts !== left.totalProducts) {
        return right.totalProducts - left.totalProducts
      }

      return compareDates(right.latestUpdate, left.latestUpdate)
    })
}

export function matchesModerationItem(item, query, filter) {
  const normalizedQuery = toText(query).trim().toLowerCase()

  if (normalizedQuery && !item.searchText.includes(normalizedQuery)) {
    return false
  }

  if (filter === 'all') {
    return true
  }

  if (filter === 'attention') {
    return item.attention
  }

  return item.decision === filter
}

export function matchesVendorInsight(item, query) {
  const normalizedQuery = toText(query).trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return `${item.vendorId} ${item.email} ${item.label}`.toLowerCase().includes(normalizedQuery)
}

export function normalizeVendorKey(value) {
  const normalized = toText(value).trim()
  return normalized || 'unassigned'
}

export function getModerationToast(decision) {
  if (decision === 'approved') {
    return 'Решение сохранено: карточка одобрена.'
  }

  if (decision === 'review') {
    return 'Карточка помечена для дополнительной проверки.'
  }

  if (decision === 'rejected') {
    return 'Карточка помечена как отклоненная.'
  }

  return 'Решение обновлено.'
}

export function readModerationState() {
  try {
    const raw = localStorage.getItem(MODERATION_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeModerationState(state) {
  try {
    localStorage.setItem(MODERATION_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore local storage write failures
  }
}

export function toSafeInteger(value) {
  const parsed = Number.parseInt(toText(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function buildProductQuality(product) {
  const description = getProductDescription(product).trim()
  const images = getProductImages(product)
  const attributes = getProductAttributes(product)
  const categoryId = getCategoryId(product)
  const price = parsePriceValue(getProductPrice(product))
  const stockStatus = getProductStatus(product)
  const flags = []

  if (!categoryId) {
    flags.push({ code: 'missing_category', label: 'Нет категории', tone: 'danger' })
  }

  if (!description) {
    flags.push({ code: 'missing_description', label: 'Нет описания', tone: 'danger' })
  } else if (description.length < 80) {
    flags.push({ code: 'short_description', label: 'Короткое описание', tone: 'warning' })
  }

  if (images.length === 0) {
    flags.push({ code: 'missing_images', label: 'Нет изображений', tone: 'danger' })
  }

  if (attributes.length === 0) {
    flags.push({ code: 'missing_attributes', label: 'Нет атрибутов', tone: 'warning' })
  }

  if (!(price > 0)) {
    flags.push({ code: 'missing_price', label: 'Нет цены', tone: 'danger' })
  }

  if (stockStatus === 'out') {
    flags.push({ code: 'out_of_stock', label: 'Нет в наличии', tone: 'warning' })
  } else if (stockStatus === 'low') {
    flags.push({ code: 'low_stock', label: 'Низкий остаток', tone: 'warning' })
  }

  const completedChecks = [Boolean(categoryId), Boolean(description), images.length > 0, attributes.length > 0, price > 0].filter(Boolean).length

  return {
    flags,
    imageCount: images.length,
    attributeCount: attributes.length,
    completenessPercent: Math.round((completedChecks / 5) * 100),
    hasContentIssue: flags.some((flag) =>
      ['missing_category', 'missing_description', 'short_description', 'missing_images', 'missing_attributes'].includes(flag.code),
    ),
    vendorLabel: buildVendorLabel(getVendorId(product)),
  }
}

export function buildVendorLabel(vendorId, vendorInfo = null) {
  const email = toText(vendorInfo?.email).trim()
  if (email) {
    return email
  }

  const normalized = toText(vendorId).trim()
  return normalized ? `Вендор ${normalized}` : 'Вендор без vendor_id'
}

function sortModerationItems(left, right) {
  if (right.riskScore !== left.riskScore) {
    return right.riskScore - left.riskScore
  }

  if (getDecisionPriority(left.decision) !== getDecisionPriority(right.decision)) {
    return getDecisionPriority(left.decision) - getDecisionPriority(right.decision)
  }

  return compareDates(right.updatedAt, left.updatedAt)
}

function compareDates(left, right) {
  return new Date(left).getTime() - new Date(right).getTime()
}

function getDecisionPriority(decision) {
  if (decision === 'review') {
    return 0
  }

  if (decision === 'rejected') {
    return 1
  }

  if (decision === 'pending') {
    return 2
  }

  return 3
}
