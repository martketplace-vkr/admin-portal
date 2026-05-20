import { Field } from '../ui'

export function AdminTariffsPage({
  tariffs,
  tariffForm,
  assignmentForm,
  busyKeys,
  onTariffFormChange,
  onAssignmentFormChange,
  onCreateTariff,
  onUpdateTariff,
  onSetDefaultTariff,
  onAssignVendorTariff,
}) {
  return (
    <div className="page-grid">
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Тарифы маркетплейса</h2>
            <p>Комиссия применяется к успешным заказам и участвует в аналитике вендоров.</p>
          </div>
          <div className="status-chip">
            <span>Всего</span>
            <strong>{tariffs.length}</strong>
          </div>
        </div>

        <form className="tariff-form" onSubmit={onCreateTariff}>
          <Field
            label="Название"
            value={tariffForm.name}
            onChange={(event) => onTariffFormChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="Например, Standard"
          />
          <Field
            label="Комиссия, %"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={tariffForm.commissionPercent}
            onChange={(event) => onTariffFormChange((current) => ({ ...current, commissionPercent: event.target.value }))}
            placeholder="5"
          />
          <button className="button button-primary" type="submit" disabled={busyKeys.tariffCreate}>
            {busyKeys.tariffCreate ? 'Создаем...' : 'Создать тариф'}
          </button>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Назначить тариф вендору</h2>
            <p>Если тариф не назначен, используется дефолтный.</p>
          </div>
        </div>

        <form className="tariff-form" onSubmit={onAssignVendorTariff}>
          <Field
            label="Vendor ID"
            type="number"
            min="1"
            value={assignmentForm.vendorId}
            onChange={(event) => onAssignmentFormChange((current) => ({ ...current, vendorId: event.target.value }))}
            placeholder="123"
          />
          <Field
            label="Тариф"
            as="select"
            value={assignmentForm.tariffId}
            onChange={(event) => onAssignmentFormChange((current) => ({ ...current, tariffId: event.target.value }))}
          >
            <option value="">Выберите тариф</option>
            {tariffs.map((tariff) => (
              <option key={tariff.id} value={tariff.id}>
                {tariff.name} - {formatPercent(tariff.commission_percent ?? tariff.commissionPercent)}
              </option>
            ))}
          </Field>
          <button className="button button-secondary" type="submit" disabled={busyKeys.tariffAssign}>
            {busyKeys.tariffAssign ? 'Назначаем...' : 'Назначить'}
          </button>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Список тарифов</h2>
          </div>
        </div>

        <div className="tariff-list">
          {tariffs.length === 0 ? (
            <div className="empty-panel">Тарифы не найдены.</div>
          ) : (
            tariffs.map((tariff) => (
              <TariffCard
                key={tariff.id}
                tariff={tariff}
                busyKeys={busyKeys}
                onUpdateTariff={onUpdateTariff}
                onSetDefaultTariff={onSetDefaultTariff}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function TariffCard({ tariff, busyKeys, onUpdateTariff, onSetDefaultTariff }) {
  const tariffId = String(tariff.id)
  const commission = tariff.commission_percent ?? tariff.commissionPercent
  const assignedVendors = tariff.assigned_vendors ?? tariff.assignedVendors ?? 0

  return (
    <form className="tariff-card" onSubmit={(event) => onUpdateTariff(event, tariff)}>
      <div className="tariff-card__summary">
        <strong>{tariff.name}</strong>
        <span>{formatPercent(commission)} за успешный заказ</span>
        <span>{assignedVendors} назначений</span>
      </div>
      <input name="name" className="field-control" defaultValue={tariff.name} aria-label="Название тарифа" />
      <input
        name="commission_percent"
        className="field-control"
        type="number"
        min="0"
        max="100"
        step="0.01"
        defaultValue={commission}
        aria-label="Процент комиссии"
      />
      <div className="tariff-card__actions">
        {tariff.is_default || tariff.isDefault ? (
          <span className="decision-pill decision-pill-approved">Дефолтный</span>
        ) : (
          <button className="button button-secondary" type="button" onClick={() => onSetDefaultTariff(tariffId)} disabled={busyKeys[`tariffDefault-${tariffId}`]}>
            Сделать дефолтным
          </button>
        )}
        <button className="button button-primary" type="submit" disabled={busyKeys[`tariffUpdate-${tariffId}`]}>
          {busyKeys[`tariffUpdate-${tariffId}`] ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

function formatPercent(value) {
  const number = Number.parseFloat(String(value || '0').replace(',', '.'))
  return `${Number.isFinite(number) ? number.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '0'}%`
}
