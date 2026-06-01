import { useMemo, useState } from 'react'
import { formatDateTime } from '../helpers'

export function AdminClientsPage({ clients, busyKeys, onReload, onLoadClient, onUpdateStatus }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [moderation, setModeration] = useState(null)
  const [reason, setReason] = useState('')
  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesStatus = !status || client.status === status
      const haystack = `${client.email || ''} ${client.first_name || ''} ${client.last_name || ''}`.toLowerCase()
      return matchesStatus && (!normalized || haystack.includes(normalized))
    })
  }, [clients, query, status])

  async function openClient(client) {
    setSelected(await onLoadClient(client.id))
  }

  async function submitModeration(event) {
    event.preventDefault()
    if (!moderation || !reason.trim()) return
    const updated = await onUpdateStatus(moderation.id, moderation.nextStatus, reason.trim())
    setSelected(updated)
    setModeration(null)
    setReason('')
  }

  return (
    <div className="page-grid">
      <section className="panel-card clients-toolbar">
        <div>
          <h1>Клиенты</h1>
          <p>Управление доступом обычных клиентов платформы.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={onReload} disabled={busyKeys.clients}>Обновить</button>
      </section>

      <section className="panel-card">
        <div className="clients-filters">
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по email или ФИО" />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </div>
        <div className="clients-table-wrap">
          <table className="clients-table">
            <thead><tr><th>Клиент</th><th>Email</th><th>Статус</th><th>Регистрация</th><th>Активность</th><th /></tr></thead>
            <tbody>
              {visibleClients.map((client) => (
                <tr key={client.id}>
                  <td><ClientIdentity client={client} /></td>
                  <td>{client.email}</td>
                  <td><Status value={client.status} /></td>
                  <td>{formatDateTime(client.created_at)}</td>
                  <td>{client.last_activity_at ? formatDateTime(client.last_activity_at) : 'Нет данных'}</td>
                  <td><button className="button button-secondary" type="button" onClick={() => openClient(client)}>Открыть</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleClients.length === 0 && <div className="empty-panel">Клиенты не найдены.</div>}
      </section>

      {selected && (
        <div className="client-drawer-overlay" onClick={() => setSelected(null)}>
          <aside className="client-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="client-drawer__close" type="button" onClick={() => setSelected(null)} aria-label="Закрыть">×</button>
            <ClientIdentity client={selected} />
            <Status value={selected.status} />
            <dl className="client-details">
              <div><dt>ID</dt><dd>{selected.id}</dd></div>
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Регистрация</dt><dd>{formatDateTime(selected.created_at)}</dd></div>
              <div><dt>Последняя активность</dt><dd>{selected.last_activity_at ? formatDateTime(selected.last_activity_at) : 'Нет данных'}</dd></div>
            </dl>
            <section><h3>Адреса</h3><div className="client-list">{(selected.addresses || []).map((item) => <span key={item.id}>{item.city}, {item.street}, {item.postalCode || item.postal_code}</span>)}{!selected.addresses?.length && <span>Нет адресов</span>}</div></section>
            <section><h3>История модерации</h3><div className="client-list">{(selected.moderation_events || []).map((item) => <span key={item.id}>{formatDateTime(item.created_at)}: {item.old_status} → {item.new_status}. {item.reason}</span>)}{!selected.moderation_events?.length && <span>Изменений статуса не было</span>}</div></section>
            <button className={`button ${selected.status === 'blocked' ? 'button-primary' : 'button-danger'}`} type="button" onClick={() => setModeration({ id: selected.id, nextStatus: selected.status === 'blocked' ? 'active' : 'blocked' })}>
              {selected.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </aside>
        </div>
      )}

      {moderation && (
        <div className="client-modal-overlay">
          <form className="client-modal" onSubmit={submitModeration}>
            <h2>{moderation.nextStatus === 'blocked' ? 'Блокировка клиента' : 'Разблокировка клиента'}</h2>
            <textarea className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Укажите причину" required />
            <div className="client-modal__actions">
              <button className="button button-secondary" type="button" onClick={() => setModeration(null)}>Отмена</button>
              <button className="button button-primary" type="submit" disabled={busyKeys[`client:${moderation.id}`]}>Подтвердить</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function ClientIdentity({ client }) {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Без имени'
  return <div className="client-identity"><span>{client.avatar_url ? <img src={client.avatar_url} alt="" /> : name.slice(0, 1)}</span><strong>{name}</strong></div>
}

function Status({ value }) {
  return <span className={`client-status client-status-${value}`}>{value === 'blocked' ? 'Заблокирован' : 'Активен'}</span>
}
