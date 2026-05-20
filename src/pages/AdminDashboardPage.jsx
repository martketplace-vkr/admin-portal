import { MetricCard } from '../ui'
import { formatDateTime, formatPrice, getProductName } from '../helpers'

export function AdminDashboardPage({
  stats,
  moderationBuckets,
  hotVendors,
  attentionProducts,
  onOpenModeration,
  onOpenVendors,
  onInspectProduct,
  onInspectVendor,
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
