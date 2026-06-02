import { MetricCard } from '../ui'
import { formatDateTime, formatPrice, getProductName } from '../helpers'
import { useState } from 'react'

export function AdminDashboardPage({
  stats,
  moderationBuckets,
  hotVendors,
  attentionProducts,
  onInspectProduct,
  onInspectVendor,
  userDashboard,
  onUserDashboardPeriodChange,
}) {
  const maxBucketValue = Math.max(1, ...moderationBuckets.map((item) => item.value))

  return (
    <div className="page-grid">
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
  const [hoverState, setHoverState] = useState(null)
  const trend = dashboard?.trend || []
  const series = [
    { key: 'new_clients', label: 'Регистрации', color: '#2563eb' },
    { key: 'active_clients', label: 'Активные', color: '#22a06b' },
    { key: 'unique_visitors', label: 'Посетители', color: '#f0a928' },
  ]
  const width = 760
  const height = 224
  const padding = { top: 14, right: 14, bottom: 34, left: 42 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const max = Math.max(1, ...trend.flatMap((item) => series.map((line) => Number(item[line.key]) || 0)))
  const tickValues = Array.from({ length: 4 }, (_, index) => (max * (3 - index)) / 3)
  const labelIndexes = getChartLabelIndexes(trend.length)
  const x = (index) => padding.left + (trend.length <= 1 ? plotWidth / 2 : (index / (trend.length - 1)) * plotWidth)
  const y = (value) => padding.top + plotHeight - ((Number(value) || 0) / max) * plotHeight
  const activeIndex = hoverState?.index ?? null
  const activePoint = activeIndex === null ? null : trend[activeIndex]
  function changeDays(value) {
    setDays(value)
    onPeriodChange(value)
  }
  function handlePointerMove(event) {
    if (trend.length === 0) return
    const svg = event.currentTarget
    const pointerX = getSvgPointerX(svg, event, width)
    const relativeX = Math.max(0, Math.min(plotWidth, pointerX - padding.left))
    const nextIndex = trend.length === 1 ? 0 : Math.round((relativeX / plotWidth) * (trend.length - 1))
    setHoverState({
      index: nextIndex,
      left: getRenderedSvgXPercent(svg, x(nextIndex), width),
    })
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
        <UserKpiChip label="Активные сегодня" value={dashboard?.active_clients_today || 0} />
        <UserKpiChip label="Заблокированы" value={dashboard?.blocked_clients || 0} tone="danger" />
        <UserKpiChip label="Уникальные посетители" value={dashboard?.unique_visitors_today || 0} />
      </div>
      <div className="user-chart-legend">{series.map((line) => <span key={line.key}><i style={{ background: line.color }} />{line.label}</span>)}</div>
      <div className="user-chart-wrap">
        <svg className="user-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Динамика пользователей" onPointerMove={handlePointerMove} onPointerLeave={() => setHoverState(null)}>
          {tickValues.map((value) => <g key={value}><line className="user-chart__grid-line" x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} /><text className="user-chart__axis-label" x={padding.left - 8} y={y(value) + 4} textAnchor="end">{formatNumber(value)}</text></g>)}
          {series.map((line) => <g key={line.key}><polyline points={trend.map((item, index) => `${x(index)},${y(item[line.key])}`).join(' ')} style={{ stroke: line.color }} />{trend.map((item, index) => <circle className={`user-chart__point ${activeIndex === index ? 'active' : ''}`} cx={x(index)} cy={y(item[line.key])} fill={line.color} key={`${line.key}-${item.day}`} r={activeIndex === index ? 5 : 3} />)}</g>)}
          {activePoint && <line className="user-chart__hover-line" x1={x(activeIndex)} x2={x(activeIndex)} y1={padding.top} y2={padding.top + plotHeight} />}
          {labelIndexes.map((index) => <text className="user-chart__axis-label" key={trend[index].day} x={x(index)} y={height - 8} textAnchor="middle">{formatShortDate(trend[index].day)}</text>)}
          <rect className="user-chart__hit-area" x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
        </svg>
        {activePoint && <div className={`user-chart-tooltip ${getTooltipAlignment(activeIndex, trend.length)}`} style={{ left: `${hoverState.left}%` }}><strong>{formatFullDate(activePoint.day)}</strong>{series.map((line) => <span key={line.key}><i style={{ background: line.color }} /><em>{line.label}</em><b>{formatNumber(activePoint[line.key])}</b></span>)}</div>}
      </div>
    </section>
  )
}

function getChartLabelIndexes(length) {
  if (length <= 4) return Array.from({ length }, (_, index) => index)
  return [...new Set([0, Math.round((length - 1) / 3), Math.round(((length - 1) * 2) / 3), length - 1])]
}

function getSvgPointerX(svg, event, fallbackWidth) {
  const matrix = svg.getScreenCTM?.()

  if (matrix) {
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(matrix.inverse()).x
  }

  const bounds = svg.getBoundingClientRect()
  return ((event.clientX - bounds.left) / bounds.width) * fallbackWidth
}

function getRenderedSvgXPercent(svg, x, fallbackWidth) {
  const bounds = svg.getBoundingClientRect()
  const matrix = svg.getScreenCTM?.()

  if (matrix) {
    const point = svg.createSVGPoint()
    point.x = x
    point.y = 0
    const renderedPoint = point.matrixTransform(matrix)
    return ((renderedPoint.x - bounds.left) / bounds.width) * 100
  }

  return (x / fallbackWidth) * 100
}

function getTooltipAlignment(index, length) {
  if (index === 0) return 'align-left'
  if (index === length - 1) return 'align-right'
  return ''
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Number(value) || 0)
}

function formatShortDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date)
}

function formatFullDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function UserKpiChip({ label, value, tone = 'default' }) {
  return (
    <div className={`status-chip user-kpi-chip user-kpi-chip-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
