import { formatDateTime, formatPrice, toText } from '../helpers'

const PAYMENT_STATUSES = [
  ['pending_funds', 'Ожидает средств'],
  ['reserved', 'Зарезервировано'],
  ['captured', 'Оплачено'],
  ['released', 'Резерв снят'],
  ['expired', 'Истекло'],
  ['cancelled', 'Отменено'],
  ['failed', 'Ошибка'],
]

const FULFILLMENT_LABELS = {
  created: 'Создан',
  assembly: 'В сборке',
  delivery_to_client: 'Передан курьеру',
  waiting_pick_up: 'Ждет получения',
  success: 'Получен',
  cancelled_by_seller: 'Отменен продавцом',
}

export function AdminOrdersPage({ orders = [], filters, busyKeys, onFilterChange, onReload, onPaymentStatusChange }) {
  return (
    <section className="panel-card admin-orders-page">
      <div className="panel-head">
        <div>
          <h2>Заказы</h2>
          <p>Контроль оплаты и состояния заказов.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={onReload} disabled={busyKeys.adminOrders}>
          {busyKeys.adminOrders ? 'Обновляем...' : 'Обновить'}
        </button>
      </div>

      <div className="admin-orders-filters">
        <label className="field">
          <span>Оплата</span>
          <select className="field-control" value={filters.paymentStatus} onChange={(event) => onFilterChange('paymentStatus', event.target.value)}>
            <option value="">Все</option>
            {PAYMENT_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Заказ</span>
          <select className="field-control" value={filters.fulfillmentStatus} onChange={(event) => onFilterChange('fulfillmentStatus', event.target.value)}>
            <option value="">Все</option>
            {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {orders.length === 0 ? (
        <div className="empty-panel compact-empty">Заказов по фильтрам нет.</div>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => {
            const orderId = getOrderId(order)
            return (
              <article key={orderId} className="admin-order-card">
                <div>
                  <strong>#{orderId} · {getProductName(order)}</strong>
                  <span>Покупатель {toText(order.userId ?? order.user_id)} · продавец {toText(order.vendorId ?? order.vendor_id)}</span>
                  <span>{formatDateTime(order.createdAt ?? order.created_at)} · {formatPrice(order.totalPrice ?? order.total_price)}</span>
                </div>
                <div className="admin-order-card__statuses">
                  <span>Заказ: {formatFulfillmentStatus(order.fulfillmentStatus ?? order.fulfillment_status ?? order.status)}</span>
                  <label className="field">
                    <span>Оплата</span>
                    <select
                      className="field-control"
                      value={normalizeStatus(order.paymentStatus ?? order.payment_status)}
                      onChange={(event) => onPaymentStatusChange(orderId, event.target.value)}
                      disabled={busyKeys[`adminOrderPayment-${orderId}`]}
                    >
                      {PAYMENT_STATUSES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function getOrderId(order) {
  return toText(order?.id ?? order?.orderId ?? order?.order_id)
}

function getProductName(order) {
  const product = order?.product || {}
  return toText(product.productName ?? product.product_name ?? order?.productName ?? order?.product_name) || 'Товар'
}

function normalizeStatus(status) {
  return toText(status).trim().toLowerCase()
}

function formatFulfillmentStatus(status) {
  return FULFILLMENT_LABELS[normalizeStatus(status)] || toText(status) || 'Неизвестно'
}
