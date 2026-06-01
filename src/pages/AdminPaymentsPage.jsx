import { formatDateTime, formatPrice, toText } from '../helpers'

export function AdminPaymentsPage({ topUps = [], exchangeRateForm, busyKeys, onExchangeRateChange, onExchangeRateSave, onConfirm }) {
  return (
    <div className="page-grid">
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Курс USDT TRC-20</h2>
            <p>Используется для товаров с автоматическим пересчетом рублевой цены.</p>
          </div>
        </div>
        <form className="tariff-form" onSubmit={onExchangeRateSave}>
          <label className="field">
            <span className="field-label">1 USDT = ₽</span>
            <input
              className="field-control"
              value={exchangeRateForm.rubPerUsdt}
              onChange={(event) => onExchangeRateChange({ rubPerUsdt: event.target.value })}
              placeholder="90.50"
            />
          </label>
          <button className="button button-primary" type="submit" disabled={busyKeys.exchangeRateSave}>
            {busyKeys.exchangeRateSave ? 'Сохраняем...' : 'Сохранить курс'}
          </button>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Ожидают оплаты</h2>
          </div>
        </div>

        <div className="payment-topup-list">
          {topUps.length === 0 ? (
            <div className="empty-panel">Pending RUB платежей нет.</div>
          ) : (
            topUps.map((topUp) => {
              const externalId = toText(topUp.externalId ?? topUp.external_id)
              const providerName = toText(topUp.providerName ?? topUp.provider_name)
              const method = providerName.includes('CARD') ? 'Карта' : 'СБП'
              const money = topUp.money || {}

              return (
                <article key={toText(topUp.id)} className="payment-topup-card">
                  <div>
                    <strong>{formatPrice(money.amount)}</strong>
                    <span>{method} · {formatDateTime(topUp.createdAt ?? topUp.created_at)}</span>
                  </div>
                  <div>
                    <span>Top-up #{toText(topUp.id)}</span>
                    <code>{externalId}</code>
                  </div>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => onConfirm(externalId)}
                    disabled={busyKeys[`paymentConfirm-${externalId}`]}
                  >
                    {busyKeys[`paymentConfirm-${externalId}`] ? 'Подтверждаем...' : 'Подтвердить оплату'}
                  </button>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
