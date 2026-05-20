export function Sidebar({
  navItems,
  currentPage,
  onNavigate,
  brandBadge,
  brandTitle,
  brandSubtitle,
  logoutLabel,
  busyKeys,
  onLogout,
}) {
  return (
    <header className="vendor-sidebar">
      <button className="sidebar-brand" type="button" onClick={() => onNavigate(navItems[0]?.path || '/')}>
        <span className="sidebar-brand__badge">{brandBadge}</span>
        <span className="sidebar-brand__copy">
          <strong>{brandTitle}</strong>
          <span>{brandSubtitle}</span>
        </span>
      </button>

      <nav className="sidebar-nav" aria-label="Навигация консоли">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-nav__link ${currentPage === item.page ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button className="button button-ghost sidebar-logout" type="button" onClick={onLogout} disabled={busyKeys.logout}>
        {logoutLabel}
      </button>
    </header>
  )
}
