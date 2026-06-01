import { formatPrice, formatUSDTPrice, toText } from '../helpers'

export const PAYMENT_STATUS_OPTIONS = [
  ['', 'Все оплаты'],
  ['pending_funds', 'Ожидает средств'],
  ['reserved', 'Зарезервировано'],
  ['captured', 'Оплачено'],
  ['released', 'Резерв снят'],
  ['expired', 'Истекло'],
  ['cancelled', 'Отменено'],
  ['failed', 'Ошибка'],
]

export const FULFILLMENT_STATUS_OPTIONS = [
  ['', 'Все статусы'],
  ['created', 'Создан'],
  ['waiting_for_payment', 'Ожидает оплаты'],
  ['assembly', 'В сборке'],
  ['delivery_to_pick_up', 'Доставка в ПВЗ'],
  ['delivery_to_client', 'Передан курьеру'],
  ['waiting_pick_up', 'Ждет получения'],
  ['success', 'Получен'],
  ['cancelled_by_client', 'Отменен покупателем'],
  ['cancelled_by_seller', 'Отменен продавцом'],
]

const FULFILLMENT_LABELS = Object.fromEntries(
  FULFILLMENT_STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => [value, label]),
)

const PAYMENT_LABELS = Object.fromEntries(
  PAYMENT_STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => [value, label]),
)

export function getOrderId(order) {
  return toText(order?.id ?? order?.orderId ?? order?.order_id)
}

export function getOrderCheckoutId(order) {
  return toText(order?.checkoutId ?? order?.checkout_id)
}

export function getOrderVendorId(order) {
  return toText(order?.vendorId ?? order?.vendor_id)
}

export function getOrderUserId(order) {
  return toText(order?.userId ?? order?.user_id)
}

export function getOrderFulfillmentStatus(order) {
  return normalizeStatus(order?.fulfillmentStatus ?? order?.fulfillment_status ?? order?.status)
}

export function getOrderPaymentStatus(order) {
  return normalizeStatus(order?.paymentStatus ?? order?.payment_status)
}

export function getOrderProductName(order) {
  const product = order?.product || {}
  return toText(product?.productName ?? product?.product_name ?? order?.productName ?? order?.product_name) || 'Товар'
}

export function getOrderImage(order) {
  const product = order?.product || {}
  return toText(product?.imageUrl ?? product?.image_url ?? order?.productImageUrl ?? order?.product_image_url)
}

export function getOrderTotal(order) {
  return toText(order?.totalPrice ?? order?.total_price)
}

export function getOrderCurrencyId(order) {
  return toText(order?.currencyId ?? order?.currency_id ?? order?.payment?.currencyId ?? order?.payment?.currency_id) || '1000'
}

export function getOrderCreatedAt(order) {
  return order?.createdAt ?? order?.created_at ?? ''
}

export function formatFulfillmentStatus(status) {
  return FULFILLMENT_LABELS[normalizeStatus(status)] || toText(status) || 'Неизвестно'
}

export function formatPaymentStatus(status) {
  return PAYMENT_LABELS[normalizeStatus(status)] || toText(status) || 'Неизвестно'
}

export function filterAdminOrders(orders, filters = {}) {
  const orderQuery = toText(filters.orderQuery).trim().toLowerCase()
  const vendorId = toText(filters.vendorId).trim()

  return [...(orders || [])]
    .filter((order) => {
      if (vendorId && getOrderVendorId(order) !== vendorId) {
        return false
      }

      if (!orderQuery) {
        return true
      }

      const haystack = [
        getOrderId(order),
        getOrderCheckoutId(order),
        getOrderVendorId(order),
        getOrderUserId(order),
        getOrderProductName(order),
        getOrderTotal(order),
        formatFulfillmentStatus(getOrderFulfillmentStatus(order)),
        formatPaymentStatus(getOrderPaymentStatus(order)),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(orderQuery)
    })
    .sort((left, right) => new Date(getOrderCreatedAt(right)).getTime() - new Date(getOrderCreatedAt(left)).getTime())
}

export function buildVendorOptions(orders, vendorById = {}) {
  const vendors = new Map()

  for (const order of orders || []) {
    const vendorId = getOrderVendorId(order)
    if (!vendorId) {
      continue
    }

    vendors.set(vendorId, (vendors.get(vendorId) || 0) + 1)
  }

  return [
    { value: '', label: 'Все вендоры' },
    ...[...vendors.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ru'))
      .map(([value, count]) => ({ value, label: `${getVendorLabel(value, vendorById)} · ${count}` })),
  ]
}

export function buildOrderAggregations(orders, vendorById = {}) {
  const byStatus = new Map()
  const byVendor = new Map()
  const revenueByCurrency = {}

  for (const order of orders || []) {
    const status = getOrderFulfillmentStatus(order)
    const vendorId = getOrderVendorId(order) || '—'

    byStatus.set(status, (byStatus.get(status) || 0) + 1)
    byVendor.set(vendorId, (byVendor.get(vendorId) || 0) + 1)
    const currencyId = getOrderCurrencyId(order)
    revenueByCurrency[currencyId] = (revenueByCurrency[currencyId] || 0) + parseMoneyAmount(getOrderTotal(order))
  }

  return {
    total: orders?.length || 0,
    vendorCount: byVendor.size,
    revenueByCurrency,
    byStatus: mapAggregationEntries(byStatus, formatFulfillmentStatus),
    byVendor: mapAggregationEntries(byVendor, (value) => (value === '—' ? 'Без вендора' : getVendorLabel(value, vendorById))),
  }
}

function mapAggregationEntries(map, labelFormatter) {
  const maxValue = Math.max(1, ...map.values())

  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      label: labelFormatter(key),
      count,
      share: count / maxValue,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ru'))
}

function normalizeStatus(status) {
  return toText(status).trim().toLowerCase()
}

function parseMoneyAmount(value) {
  const normalized = toText(value).replace(/\s+/g, '').replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) {
    return 0
  }

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatOrderMoney(value, orderOrCurrencyId) {
  const currencyId = typeof orderOrCurrencyId === 'string' || typeof orderOrCurrencyId === 'number'
    ? toText(orderOrCurrencyId)
    : getOrderCurrencyId(orderOrCurrencyId)

  return currencyId === '2001' ? formatUSDTPrice(value) : formatPrice(value)
}

export function formatAggregationRevenue(revenueByCurrency) {
  const totals = Object.entries(revenueByCurrency || {})
    .filter(([, total]) => total > 0)
    .map(([currencyId, total]) => formatOrderMoney(total, currencyId))

  return totals.length > 0 ? totals.join(' + ') : formatPrice(0)
}

export function getVendorLabel(vendorId, vendorById = {}) {
  const normalizedVendorId = toText(vendorId).trim()
  if (!normalizedVendorId) {
    return 'Без вендора'
  }

  return toText(vendorById[normalizedVendorId]?.email).trim() || `Вендор ${normalizedVendorId}`
}
