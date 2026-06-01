import { MetricCard } from '../ui'
import { formatDateTime, formatPrice, getProductName } from '../helpers'

export function AdminVendorsPage({
  vendors,
  vendorOptions = [],
  search,
  onSearchChange,
  onOpenVendor,
}) {
  return (
    <div className="page-grid">
      <section className="panel-card panel-list">
        <div className="panel-head">
          <div>
            <h2>Срез по владельцам каталога</h2>
          </div>
          <div className="status-chip">
            <span>Всего</span>
            <strong>{vendors.length}</strong>
          </div>
        </div>

        <label className="search-shell">
          <span>Поиск по email вендора</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="seller@example.com"
            list="vendor-list-email-options"
          />
          <datalist id="vendor-list-email-options">
            {vendorOptions.map((vendor) => (
              <option key={vendor.id} value={vendor.email} />
            ))}
          </datalist>
        </label>

        <div className="review-stack">
          {vendors.length === 0 ? (
            <div className="empty-panel">
              <h3>Вендоры не найдены</h3>
            </div>
          ) : (
            vendors.map((vendor) => (
              <button
                key={vendor.vendorId}
                className="vendor-insight-card vendor-list-card"
                type="button"
                onClick={() => onOpenVendor(vendor.vendorId)}
              >
                <div className="vendor-insight-card__top">
                  <strong>ID: {vendor.vendorId}</strong>
                </div>
                <span className="review-card__meta">{vendor.label}</span>
                <span className={`decision-pill ${vendor.attentionCount > 0 ? 'decision-pill-review' : 'decision-pill-approved'}`}>
                  {vendor.attentionCount > 0 ? `${vendor.attentionCount} проблемных` : 'Стабильно'}
                </span>
                <span className="review-card__meta">
                  {vendor.totalProducts} товаров • {vendor.totalStock} единиц • покрытие {vendor.completenessPercent}%
                </span>
                <span className="review-card__meta">
                  На модерации {vendor.pendingCount + vendor.reviewCount} • отклонено {vendor.rejectedCount}
                </span>
                <span className="review-card__meta vendor-insight-card__action">Открыть профиль</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export function AdminVendorProfilePage({
  vendor,
  vendorId,
  vendorTitle,
  tariffs = [],
  currentTariff,
  busyKeys = {},
  onBack,
  onInspectProduct,
  onAssignTariff,
}) {
  if (!vendor) {
    return (
      <div className="page-grid">
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Вендор не найден</h2>
            </div>
          </div>
          <div className="empty-panel">
            <h3>Нет данных по вендору {vendorId}</h3>
            <button className="button button-secondary" type="button" onClick={onBack}>
              Вернуться к списку
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid">
      <section className="panel-card panel-editor vendor-profile">
        <div className="panel-head vendor-profile__head">
          <div>
            <h2>ID: {vendor.vendorId}</h2>
            <p>{vendorTitle || vendor.label}</p>
          </div>
          <div className="vendor-profile__actions">
            <button className="button button-secondary" type="button" onClick={onBack}>
              Назад к списку
            </button>
            <div className="status-chip">
              <span>Последнее обновление</span>
              <strong>{formatDateTime(vendor.latestUpdate)}</strong>
            </div>
          </div>
        </div>

        <section className="metric-grid metric-grid-compact">
          <MetricCard label="Товаров" value={vendor.totalProducts} hint="в каталоге платформы" />
          <MetricCard label="Стоимость витрины" value={formatPrice(vendor.inventoryValue)} hint="цена x остаток" />
          <MetricCard label="В зоне риска" value={vendor.attentionCount} hint="нужна проверка" tone="warning" />
        </section>

        <section className="text-surface vendor-tariff-panel">
          <div>
            <strong>Тариф вендора</strong>
            <p>
              {currentTariff
                ? `${currentTariff.name}: ${formatPercent(currentTariff.commission_percent ?? currentTariff.commissionPercent)} за успешный заказ`
                : 'Используется дефолтный тариф или данные еще загружаются.'}
            </p>
          </div>
          <label className="field vendor-tariff-panel__select">
            <span className="field-label">Назначить тариф</span>
            <select
              className="field-control"
              value={currentTariff?.id || ''}
              onChange={(event) => onAssignTariff(vendor.vendorId, event.target.value)}
              disabled={busyKeys[`vendorTariff-${vendor.vendorId}`]}
            >
              <option value="">Выберите тариф</option>
              {tariffs.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name} - {formatPercent(tariff.commission_percent ?? tariff.commissionPercent)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="lineup">
          {vendor.items.map((item) => (
            <article key={item.productId} className="lineup-item vendor-product-card">
              <div>
                <strong>{getProductName(item.product) || 'Без названия'}</strong>
                <span>
                  {formatPrice(item.priceNumber)} • риск {item.riskScore} • {formatDateTime(item.updatedAt)}
                </span>
              </div>
              <button className="button button-secondary" type="button" onClick={() => onInspectProduct(item.productId)}>
                Модерация
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function formatPercent(value) {
  const number = Number.parseFloat(String(value || '0').replace(',', '.'))
  return `${Number.isFinite(number) ? number.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '0'}%`
}
