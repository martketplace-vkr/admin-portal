import { MetricCard } from '../ui'
import { formatDateTime, formatPrice, getProductName } from '../helpers'
import { useState } from 'react'

export function AdminDashboardPage({
  stats,
  moderationBuckets,
  hotVendors,
  attentionProducts,
  onOpenModeration,
  onOpenVendors,
  onInspectProduct,
  onInspectVendor,
  userDashboard,
  onUserDashboardPeriodChange,
}) {
  const maxBucketValue = Math.max(1, ...moderationBuckets.map((item) => item.value))

  return (
    <div className="page-grid">
      <section className="hero-strip">
        <div>
          <h2>Админская часть собрана вокруг каталога платформы, очереди модерации и здоровья вендоров.</h2>
        </div>
        <div className="hero-strip__actions">
          <button className="button button-primary" type="button" onClick={onOpenModeration}>
            Разобрать очередь
          </button>
          <button className="button button-secondary" type="button" onClick={onOpenVendors}>
            Открыть вендоров
          </button>
        </div>
      </section>

      <UserDashboard dashboard={userDashboard} onPeriodChange={onUserDashboardPeriodChange} />

      <section className="metric-grid">
        <MetricCard label="Товаров" value={stats.totalProducts} hint="во всем каталоге" />
        <MetricCard label="Вендоров" value={stats.totalVendors} hint="по vendor_id" tone="accent" />
        <MetricCard label="В зоне риска" value={stats.attentionCount} hint="есть проблемы по контенту или стоку" tone="warning" />
        <MetricCard label="На модерации" value={stats.pendingCount + stats.reviewCount} hint="без финального решения" />
        <MetricCard label="Отклонено" value={stats.rejectedCount} hint="нужно вернуться к карточке" tone="danger" />
      </section>

      <div className="page-split">
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Статусы модерации</h2>
            </div>
          </div>

          <div className="bar-stack">
            {moderationBuckets.map((item) => (
              <div key={item.label} className="bar-row">
                <div className="bar-row__copy">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
                <div className="bar-row__track">
                  <div className={`bar-row__fill tone-${item.tone}`} style={{ width: `${(item.value / maxBucketValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Кому сейчас нужно внимание платформы</h2>
            </div>
          </div>

          <div className="lineup">
            {hotVendors.length === 0 ? (
              <div className="empty-panel">
                <h3>Данные появятся после загрузки каталога</h3>
              </div>
            ) : (
              hotVendors.map((vendor) => (
                <article key={vendor.vendorId} className="lineup-item">
                  <div>
                    <strong>{vendor.label}</strong>
                    <span>
                      {vendor.totalProducts} товаров, {vendor.attentionCount} в зоне риска, покрытие {vendor.completenessPercent}%
                    </span>
                  </div>
                  <button className="button button-secondary" type="button" onClick={() => onInspectVendor(vendor.vendorId)}>
                    Открыть
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Карточки, которые стоит проверить в первую очередь</h2>
          </div>
        </div>

        <div className="lineup">
          {attentionProducts.length === 0 ? (
            <div className="empty-panel">
              <h3>Очередь пуста</h3>
            </div>
          ) : (
            attentionProducts.map((item) => (
              <article key={item.productId} className="lineup-item lineup-item-stack">
                <div>
                  <strong>{getProductName(item.product) || 'Без названия'}</strong>
                  <span>
                    {item.vendorLabel} • {formatPrice(item.priceNumber)} • обновлено {formatDateTime(item.updatedAt)}
                  </span>
                  <div className="flag-stack">
                    {item.flags.slice(0, 4).map((flag) => (
                      <span key={`${item.productId}-${flag.code}`} className={`flag-chip flag-chip-${flag.tone}`}>
                        {flag.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="button button-primary" type="button" onClick={() => onInspectProduct(item.productId)}>
                  Открыть в модерации
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function UserDashboard({ dashboard, onPeriodChange }) {
  const [days, setDays] = useState(7)
  const trend = dashboard?.trend || []
  const max = Math.max(1, ...trend.flatMap((item) => [item.new_clients || 0, item.active_clients || 0, item.unique_visitors || 0]))
  const width = 760
  const height = 180
  const points = (key) => trend.map((item, index) => `${trend.length <= 1 ? 0 : (index / (trend.length - 1)) * width},${height - ((item[key] || 0) / max) * height}`).join(' ')
  function changeDays(value) {
    setDays(value)
    onPeriodChange(value)
  }
  return (
    <section className="panel-card user-dashboard">
      <div className="panel-head">
        <h2>Пользователи</h2>
        <div className="segmented-control">
          {[7, 30].map((value) => <button className={days === value ? 'active' : ''} type="button" key={value} onClick={() => changeDays(value)}>{value} дней</button>)}
        </div>
      </div>
      <div className="user-kpi-grid">
        <UserKpiChip label="Всего клиентов" value={dashboard?.total_clients || 0} />
        <UserKpiChip label="Новые сегодня" value={dashboard?.new_clients_today || 0} tone="accent" />
        <UserKpiChip label="Изменение к вчера" value={`${Number(dashboard?.new_clients_delta_percent || 0).toFixed(1)}%`} />
        <UserKpiChip label="Активные сегодня" value={dashboard?.active_clients_today || 0} />
        <UserKpiChip label="Заблокированы" value={dashboard?.blocked_clients || 0} tone="danger" />
        <UserKpiChip label="Уникальные посетители" value={dashboard?.unique_visitors_today || 0} />
      </div>
      <div className="user-chart-legend"><span><i className="line-new" />Регистрации</span><span><i className="line-active" />Активные</span><span><i className="line-visitors" />Посетители</span></div>
      <svg className="user-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Динамика пользователей">
        <polyline className="line-new" points={points('new_clients')} />
        <polyline className="line-active" points={points('active_clients')} />
        <polyline className="line-visitors" points={points('unique_visitors')} />
      </svg>
    </section>
  )
}

function UserKpiChip({ label, value, tone = 'default' }) {
  return (
    <div className={`status-chip user-kpi-chip user-kpi-chip-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
