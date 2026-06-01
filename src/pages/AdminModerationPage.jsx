import { Field } from '../ui'
import {
  formatPrice,
  formatUSDTPrice,
  getCategoryId,
  getProductAcceptsCrypto,
  getProductAttributes,
  getProductCostPrice,
  getProductCryptoPriceUSDT,
  getProductCryptoPricingMode,
  getProductDescription,
  getProductImages,
  getProductName,
  getProductPrice,
  getStockCount,
  toText,
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

        <ModerationProductPreview product={item.product} categoryLabelById={categoryLabelById} />

        <div className="admin-meta-grid moderation-decision-grid">
          <div className="metric-card metric-card-default">
            <span className="metric-card__label">Вендор</span>
            <button className="moderation-vendor-link" type="button" onClick={() => onOpenVendor(item.vendorId)}>
              {item.vendorEmail || item.vendorLabel}
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

function ModerationProductPreview({ product, categoryLabelById }) {
  const images = normalizeProductImages(getProductImages(product))
  const attributes = normalizeProductAttributes(getProductAttributes(product))
  const acceptsCrypto = getProductAcceptsCrypto(product)
  const cryptoPricingMode = getProductCryptoPricingMode(product)
  const cryptoPrice = getProductCryptoPriceUSDT(product)
  const categoryLabel = categoryLabelById[getCategoryId(product)] || 'Не указана'

  return (
    <section className="moderation-product-preview">
      <div className="readonly-field">
        <span className="field-label">Категория</span>
        <strong>{categoryLabel}</strong>
      </div>

      <div className="readonly-field">
        <span className="field-label">Название</span>
        <strong>{getProductName(product) || 'Без названия'}</strong>
      </div>

      <div className="readonly-field readonly-field-block">
        <span className="field-label">Описание</span>
        <p>{getProductDescription(product) || 'Описание не указано'}</p>
      </div>

      <div className="form-split form-split-three">
        <ReadonlyValue label="Цена" value={formatPrice(getProductPrice(product))} />
        <ReadonlyValue label="Себестоимость" value={formatOptionalPrice(getProductCostPrice(product))} />
        <ReadonlyValue label="Остаток" value={getStockCount(product) || '0'} />
      </div>

      <div className="readonly-field readonly-field-block">
        <span className="field-label">Оплата в USDT TRC-20</span>
        <strong>{acceptsCrypto ? 'Включена' : 'Выключена'}</strong>
        {acceptsCrypto ? (
          <p>
            {cryptoPricingMode === 'fixed_usdt'
              ? `Фиксированная цена: ${formatOptionalUSDTPrice(cryptoPrice)}`
              : 'Пересчет из рублей по курсу платформы'}
          </p>
        ) : null}
      </div>

      <div className="field">
        <span className="field-label">Атрибуты</span>
        {attributes.length === 0 ? (
          <div className="empty-panel compact-empty">Атрибуты не указаны.</div>
        ) : (
          <div className="characteristic-sections">
            {attributes.map((section, sectionIndex) => (
              <div className="characteristic-section" key={`${section.title}-${sectionIndex}`}>
                <div className="characteristic-section__head">
                  <strong>{section.title || `Раздел ${sectionIndex + 1}`}</strong>
                </div>
                <div className="attribute-editor">
                  {section.attributes.map((attribute, attributeIndex) => (
                    <div className="attribute-row attribute-row-readonly" key={`${attribute.key}-${attributeIndex}`}>
                      <span>{attribute.key || 'Параметр'}</span>
                      <strong>{attribute.value || 'Не указано'}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">Изображения</span>
        {images.length === 0 ? (
          <div className="empty-panel compact-empty">Изображения не загружены.</div>
        ) : (
          <div className="image-upload-list">
            {images.map((image, index) => (
              <div className={`image-upload-item ${image.isMain ? 'is-main' : ''}`} key={`${image.url}-${index}`}>
                <div className="image-upload-item__preview">
                  <img src={image.url} alt={`Изображение товара ${index + 1}`} />
                </div>
                <div className="image-upload-item__body">
                  <strong>{image.isMain ? 'Основное изображение' : `Изображение ${index + 1}`}</strong>
                  <span>{image.url}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ReadonlyValue({ label, value }) {
  return (
    <div className="readonly-field">
      <span className="field-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function normalizeProductAttributes(attributes) {
  if (!Array.isArray(attributes)) {
    return []
  }

  const looksLikeFlatAttributes = attributes.some((attribute) => !Array.isArray(attribute?.attributes))
  if (looksLikeFlatAttributes) {
    return [{
      title: 'Характеристики',
      attributes: attributes
        .map((attribute) => ({
          key: toText(attribute?.key ?? attribute?.name).trim(),
          value: toText(attribute?.value).trim(),
        }))
        .filter((attribute) => attribute.key || attribute.value),
    }].filter((section) => section.attributes.length > 0)
  }

  return attributes
    .map((section) => ({
      title: toText(section?.title).trim(),
      attributes: Array.isArray(section?.attributes)
        ? section.attributes
          .map((attribute) => ({
            key: toText(attribute?.key ?? attribute?.name).trim(),
            value: toText(attribute?.value).trim(),
          }))
          .filter((attribute) => attribute.key || attribute.value)
        : [],
    }))
    .filter((section) => section.title || section.attributes.length > 0)
}

function normalizeProductImages(images) {
  if (!Array.isArray(images)) {
    return []
  }

  return images
    .map((image, index) => ({
      url: toText(image?.url ?? image?.image_url ?? image).trim(),
      isMain: Boolean(image?.isMain ?? image?.is_main ?? index === 0),
    }))
    .filter((image) => image.url)
    .map((image, index) => ({
      ...image,
      isMain: index === 0 || image.isMain,
    }))
}

function formatOptionalPrice(value) {
  return toText(value).trim() ? formatPrice(value) : 'Не указана'
}

function formatOptionalUSDTPrice(value) {
  return toText(value).trim() ? formatUSDTPrice(value) : 'Не указана'
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
