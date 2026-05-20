import { Field } from '../ui'
import {
  formatPrice,
  getCategoryId,
  getProductName,
  getStockCount,
} from '../helpers'

export function AdminModerationPage({
  queue,
  filters,
  search,
  filter,
  categoryLabelById,
  onSearchChange,
  onFilterChange,
  onOpenProduct,
}) {
  return (
    <div className="page-grid">
      <section className="panel-card panel-list">
        <div className="panel-head">
          <div>
            <h2>Товары на ручной проверке</h2>
          </div>
          <div className="status-chip">
            <span>Карточек</span>
            <strong>{queue.length}</strong>
          </div>
        </div>

        <label className="search-shell">
          <span>Поиск</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Товар, vendor_id, категория"
          />
        </label>

        <div className="filters-row">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`filter-chip ${filter === item.value ? 'active' : ''}`}
              type="button"
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="review-stack">
          {queue.length === 0 ? (
            <div className="empty-panel">
              <h3>Под текущий фильтр ничего не попало</h3>
            </div>
          ) : (
            queue.map((item) => (
              <button
                key={item.productId}
                className="review-card moderation-list-card"
                type="button"
                onClick={() => onOpenProduct(item.productId)}
              >
                <div className="review-card__top">
                  <strong>{getProductName(item.product) || 'Без названия'}</strong>
                </div>
                <span className={`decision-pill decision-pill-${item.decision}`}>{getDecisionLabel(item.decision)}</span>
                <span className="review-card__meta">
                  {item.vendorLabel} • {categoryLabelById[getCategoryId(item.product)] || 'Без категории'}
                </span>
                <span className="review-card__meta">
                  {formatPrice(item.priceNumber)} • остаток {getStockCount(item.product) || '0'} • риск {item.riskScore}
                </span>
                <div className="flag-stack">
                  {item.flags.slice(0, 3).map((flag) => (
                    <span key={`${item.productId}-${flag.code}`} className={`flag-chip flag-chip-${flag.tone}`}>
                      {flag.label}
                    </span>
                  ))}
                </div>
                <span className="review-card__meta review-card__action">Открыть карточку</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export function AdminModerationProductPage({
  item,
  productId,
  categoryLabelById,
  onBack,
  onSetDecision,
  onChangeNote,
  onOpenVendor,
}) {
  if (!item) {
    return (
      <div className="page-grid">
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2>Товар не найден</h2>
            </div>
          </div>
          <div className="empty-panel">
            <h3>Нет данных по product_id {productId}</h3>
            <button className="button button-secondary" type="button" onClick={onBack}>
              Вернуться к очереди
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid">
      <section className="panel-card panel-editor moderation-product">
        <div className="panel-head">
          <div>
            <h2>{getProductName(item.product) || 'Без названия'}</h2>
          </div>
          <div className="moderation-product__actions">
            <button className="button button-secondary" type="button" onClick={onBack}>
              Назад к очереди
            </button>
            <span className={`decision-pill decision-pill-${item.decision}`}>
              {getDecisionLabel(item.decision)}
            </span>
          </div>
        </div>

        <div className="admin-meta-grid">
          <div className="metric-card metric-card-default">
            <span className="metric-card__label">Вендор</span>
            <strong className="metric-card__value metric-card__value-small">{item.vendorLabel}</strong>
            <button className="button button-secondary" type="button" onClick={() => onOpenVendor(item.vendorId)}>
              Профиль вендора
            </button>
          </div>
          <div className="metric-card metric-card-default">
            <span className="metric-card__label">Категория</span>
            <strong className="metric-card__value metric-card__value-small">
              {categoryLabelById[getCategoryId(item.product)] || 'Не указана'}
            </strong>
          </div>
          <div className="metric-card metric-card-default">
            <span className="metric-card__label">Контент</span>
            <strong className="metric-card__value metric-card__value-small">{item.completenessPercent}%</strong>
          </div>
        </div>

        <div className="flag-stack">
          {item.flags.length === 0 ? (
            <span className="flag-chip flag-chip-accent">Явных проблем не найдено</span>
          ) : (
            item.flags.map((flag) => (
              <span key={`${item.productId}-${flag.code}`} className={`flag-chip flag-chip-${flag.tone}`}>
                {flag.label}
              </span>
            ))
          )}
        </div>

        <Field
          label="Комментарий модератора"
          as="textarea"
          rows={6}
          value={item.note}
          onChange={(event) => onChangeNote(item.productId, event.target.value)}
          placeholder=""
        />

        <div className="editor-actions">
          <button className="button button-primary" type="button" onClick={() => onSetDecision(item.productId, 'approved')}>
            Одобрить
          </button>
          <button className="button button-secondary" type="button" onClick={() => onSetDecision(item.productId, 'review')}>
            На проверку
          </button>
          <button className="button button-ghost" type="button" onClick={() => onSetDecision(item.productId, 'rejected')}>
            Отклонить
          </button>
        </div>
      </section>
    </div>
  )
}

function getDecisionLabel(decision) {
  if (decision === 'approved') {
    return 'Одобрено'
  }

  if (decision === 'review') {
    return 'На проверке'
  }

  if (decision === 'rejected') {
    return 'Отклонено'
  }

  return 'Ожидает'
}
