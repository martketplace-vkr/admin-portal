import { useState } from 'react'

export function AdminCategoriesPage({
  categories,
  categoryOptions,
  busyKeys,
  onCreateCategory,
  onDeleteCategory,
}) {
  const [activeParentId, setActiveParentId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(() => new Set())

  function openComposer(parentId = '') {
    setActiveParentId(parentId)
    setDraftName('')
  }

  function closeComposer() {
    setActiveParentId(null)
    setDraftName('')
  }

  async function submitComposer(event) {
    event.preventDefault()
    const created = await onCreateCategory({ name: draftName, parentId: activeParentId || '' })

    if (created) {
      setActiveParentId(null)
      setDraftName('')
    }
  }

  function toggleCollapsed(categoryId) {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current)

      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }

      return next
    })
  }

  async function deleteCategory(category) {
    const categoryName = category?.name || 'категорию'
    const confirmed = window.confirm(`Удалить категорию "${categoryName}"?`)

    if (!confirmed) {
      return
    }

    await onDeleteCategory(category?.id)
  }

  return (
    <div className="page-grid">
      <section className="panel-card panel-list category-panel">
        <div className="panel-head category-panel__head">
          <div>
            {/* <h2>Текущие категории</h2> */}
          </div>
          <div className="category-panel__actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => openComposer('')}
              aria-label="Добавить корневую категорию"
              title="Добавить корневую категорию"
            >
              +
            </button>
            <div className="status-chip">
              <span>Всего</span>
              <strong>{categoryOptions.length}</strong>
            </div>
          </div>
        </div>

        {activeParentId === '' ? (
          <CategoryComposer
            title="Новая корневая категория"
            value={draftName}
            busy={busyKeys.categoryCreate}
            onChange={setDraftName}
            onSubmit={submitComposer}
            onCancel={closeComposer}
          />
        ) : null}

        {categories.length === 0 ? (
          <div className="empty-panel category-empty">
            <button
              className="icon-button icon-button-large"
              type="button"
              onClick={() => openComposer('')}
              aria-label="Добавить первую категорию"
              title="Добавить первую категорию"
            >
              +
            </button>
            <h3>Категории пока не добавлены</h3>
          </div>
        ) : (
          <div className="category-tree">
            {categories.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                activeParentId={activeParentId}
                collapsedCategoryIds={collapsedCategoryIds}
                draftName={draftName}
                busy={busyKeys.categoryCreate}
                busyKeys={busyKeys}
                onOpenComposer={openComposer}
                onToggleCollapsed={toggleCollapsed}
                onDeleteCategory={deleteCategory}
                onDraftChange={setDraftName}
                onSubmit={submitComposer}
                onCancel={closeComposer}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CategoryTreeItem({
  category,
  activeParentId,
  collapsedCategoryIds,
  draftName,
  busy,
  busyKeys,
  onOpenComposer,
  onToggleCollapsed,
  onDeleteCategory,
  onDraftChange,
  onSubmit,
  onCancel,
  depth = 0,
}) {
  const categoryId = `${category?.id || ''}`
  const children = Array.isArray(category?.children) ? category.children : []
  const composerOpen = activeParentId === categoryId
  const collapsed = collapsedCategoryIds.has(categoryId)
  const hasChildren = children.length > 0
  const deleteBusy = Boolean(busyKeys[`categoryDelete:${categoryId}`])

  return (
    <div className="category-tree__branch">
      <article className="lineup-item category-tree__item" style={{ marginLeft: `${Math.min(depth, 6) * 18}px` }}>
        <div className="category-tree__main">
          <button
            className={`tree-toggle ${hasChildren ? '' : 'tree-toggle-empty'}`}
            type="button"
            onClick={() => (hasChildren ? onToggleCollapsed(categoryId) : undefined)}
            disabled={!hasChildren}
            aria-label={collapsed ? 'Развернуть категорию' : 'Свернуть категорию'}
            title={hasChildren ? (collapsed ? 'Развернуть' : 'Свернуть') : ''}
          >
            {hasChildren ? <span className="tree-toggle__chevron" /> : null}
          </button>
          <div className="category-tree__copy">
            <strong>{category?.name || 'Без названия'}</strong>
            <span>ID {category?.id}</span>
          </div>
        </div>
        <div className="category-tree__tools">
          {hasChildren ? (
            <span className="decision-pill decision-pill-pending">{children.length} подкат.</span>
          ) : null}
          <button
            className="icon-button"
            type="button"
            onClick={() => onOpenComposer(categoryId)}
            aria-label={`Добавить подкатегорию в ${category?.name || 'категорию'}`}
            title="Добавить подкатегорию"
          >
            +
          </button>
          <button
            className="icon-button icon-button-danger"
            type="button"
            onClick={() => onDeleteCategory(category)}
            disabled={deleteBusy}
            aria-label={`Удалить категорию ${category?.name || ''}`}
            title="Удалить категорию"
          >
            ×
          </button>
        </div>
      </article>

      {composerOpen ? (
        <div className="category-tree__composer" style={{ marginLeft: `${Math.min(depth + 1, 6) * 18}px` }}>
          <CategoryComposer
            title={`Новая подкатегория: ${category?.name || 'категория'}`}
            value={draftName}
            busy={busy}
            onChange={onDraftChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      ) : null}

      {!collapsed
        ? children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              activeParentId={activeParentId}
              collapsedCategoryIds={collapsedCategoryIds}
              draftName={draftName}
              busy={busy}
              busyKeys={busyKeys}
              onOpenComposer={onOpenComposer}
              onToggleCollapsed={onToggleCollapsed}
              onDeleteCategory={onDeleteCategory}
              onDraftChange={onDraftChange}
              onSubmit={onSubmit}
              onCancel={onCancel}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  )
}

function CategoryComposer({ title, value, busy, onChange, onSubmit, onCancel }) {
  return (
    <form className="category-composer" onSubmit={onSubmit}>
      <div>
        <span className="field-label">{title}</span>
        <input
          className="field-control"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Название категории"
          autoFocus
          disabled={busy}
        />
      </div>
      <div className="category-composer__actions">
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Создаем...' : 'Добавить'}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      </div>
    </form>
  )
}
