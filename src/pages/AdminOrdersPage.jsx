import { formatDateTime } from '../helpers'
import {
  formatAggregationRevenue,
  formatFulfillmentStatus,
  formatOrderMoney,
  formatPaymentStatus,
  FULFILLMENT_STATUS_OPTIONS,
  getOrderCheckoutId,
  getOrderCreatedAt,
  getOrderFulfillmentStatus,
  getOrderId,
  getOrderImage,
  getOrderPaymentStatus,
  getOrderProductName,
  getOrderTotal,
  getOrderUserId,
  getOrderVendorId,
  getVendorLabel,
  PAYMENT_STATUS_OPTIONS,
} from '../hooks/adminOrderModel'

export function AdminOrdersPage({
  orders = [],
  aggregations,
  vendorOptions = [],
  vendorById = {},
  filters,
  busyKeys,
  onFilterChange,
  onReload,
  onPaymentStatusChange,
  onOpenVendor,
}) {
  const maxStatusValue = Math.max(1, ...aggregations.byStatus.map((item) => item.count))
  const maxVendorValue = Math.max(1, ...aggregations.byVendor.map((item) => item.count))

  return (
    <div className="page-grid orders-page">
      <section className="metric-grid metric-grid-compact">
        <article className="metric-card">
          <span className="metric-card__label">Заказов в выборке</span>
          <strong className="metric-card__value">{aggregations.total}</strong>
        </article>
        <article className="metric-card metric-card-accent">
          <span className="metric-card__label">Вендоров</span>
          <strong className="metric-card__value">{aggregations.vendorCount}</strong>
        </article>
        <article className="metric-card metric-card-warning">
          <span className="metric-card__label">Сумма выборки</span>
          <strong className="metric-card__value metric-card__value-small">{formatAggregationRevenue(aggregations.revenueByCurrency)}</strong>
        </article>
      </section>

      <div className="page-split">
        <AggregationPanel title="Агрегация по статусу заказа" items={aggregations.byStatus} maxValue={maxStatusValue} />
        <AggregationPanel title="Агрегация по вендору" items={aggregations.byVendor} maxValue={maxVendorValue} onItemClick={onOpenVendor} />
      </div>

      <section className="panel-card orders-board">
        <div className="panel-head orders-board__head">
          <div>
            <h2>Заказы платформы</h2>
            <p>Фильтруйте по номеру, вендору, оплате и статусу выполнения. Сводки пересчитываются по текущей выборке.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={onReload} disabled={busyKeys.adminOrders}>
            {busyKeys.adminOrders ? 'Обновляем...' : 'Обновить'}
          </button>
        </div>

        <div className="orders-toolbar admin-orders-toolbar">
          <label className="search-shell orders-search">
            <span>Номер заказа</span>
            <input
              value={filters.orderQuery}
              onChange={(event) => onFilterChange('orderQuery', event.target.value)}
              placeholder="ID, checkout, товар, покупатель"
            />
          </label>

          <label className="field admin-orders-filter">
            <span>Вендор</span>
            <select className="field-control" value={filters.vendorId} onChange={(event) => onFilterChange('vendorId', event.target.value)}>
              {vendorOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field admin-orders-filter">
            <span>Оплата</span>
            <select className="field-control" value={filters.paymentStatus} onChange={(event) => onFilterChange('paymentStatus', event.target.value)}>
              {PAYMENT_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value || 'all-payment'} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field admin-orders-filter">
            <span>Статус заказа</span>
            <select className="field-control" value={filters.fulfillmentStatus} onChange={(event) => onFilterChange('fulfillmentStatus', event.target.value)}>
              {FULFILLMENT_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value || 'all-fulfillment'} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="orders-list">
          {orders.length === 0 ? (
            <div className="empty-panel empty-panel-large">
              <h3>Заказов нет</h3>
              <p>Измените фильтры или дождитесь новых оформлений на витрине.</p>
            </div>
          ) : (
            orders.map((order) => {
              const orderId = getOrderId(order)
              const fulfillmentStatus = getOrderFulfillmentStatus(order)
              const paymentStatus = getOrderPaymentStatus(order)

              return (
                <article key={orderId} className="vendor-order-card admin-order-card">
                  <div className="vendor-order-card__main">
                    <div className="vendor-order-card__media">
                      {getOrderImage(order) ? (
                        <img src={getOrderImage(order)} alt={getOrderProductName(order)} />
                      ) : (
                        <span>{getOrderProductName(order).slice(0, 1) || '#'}</span>
                      )}
                    </div>

                    <div className="vendor-order-card__copy">
                      <div className="vendor-order-card__topline">
                        <strong>Заказ #{orderId}</strong>
                        <span className={`order-status-pill order-status-${fulfillmentStatus}`}>{formatFulfillmentStatus(fulfillmentStatus)}</span>
                      </div>
                      <h3>{getOrderProductName(order)}</h3>
                      <p>
                        Checkout {getOrderCheckoutId(order) || '—'} · покупатель {getOrderUserId(order) || '—'} · вендор {getVendorLabel(getOrderVendorId(order), vendorById)}
                      </p>
                      <div className="vendor-order-card__meta">
                        <span>Создан: {formatDateTime(getOrderCreatedAt(order))}</span>
                        <span>Оплата: {formatPaymentStatus(paymentStatus)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="vendor-order-card__summary">
                    <div>
                      <span>Сумма</span>
                      <strong>{formatOrderMoney(getOrderTotal(order), order)}</strong>
                    </div>
                  </div>

                  <div className="vendor-order-card__actions admin-order-card__actions">
                    <label className="field order-status-select">
                      <span className="field-label">Статус оплаты</span>
                      <select
                        className="field-control"
                        value={paymentStatus}
                        onChange={(event) => onPaymentStatusChange(orderId, event.target.value)}
                        disabled={busyKeys[`adminOrderPayment-${orderId}`]}
                      >
                        {PAYMENT_STATUS_OPTIONS.filter(([value]) => value).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

function AggregationPanel({ title, items, maxValue, onItemClick }) {
  return (
    <section className="panel-card">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-panel compact-empty">Нет данных для агрегации.</div>
      ) : (
        <div className="bar-stack">
          {items.map((item) => (
            <div key={`${title}-${item.key}`} className="bar-row">
              <div className="bar-row__copy">
                {onItemClick && item.key !== '—' ? (
                  <button className="bar-row__link" type="button" onClick={() => onItemClick(item.key)}>
                    {item.label}
                  </button>
                ) : (
                  <strong>{item.label}</strong>
                )}
                <span>{item.count}</span>
              </div>
              <div className="bar-row__track">
                <div className="bar-row__fill" style={{ width: `${(item.count / maxValue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
