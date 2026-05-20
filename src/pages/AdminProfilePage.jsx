import { Field, FileUploadField } from '../ui'

export function AdminProfilePage({
  profileForm,
  busyKeys,
  onProfileChange,
  onProfileSubmit,
  onAvatarUpload,
}) {
  return (
    <div className="page-grid page-grid-profile">
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>Данные сотрудника платформы</h2>
          </div>
        </div>

        <form className="editor-form" onSubmit={onProfileSubmit}>
          <div className="form-split">
            <Field
              label="Имя"
              value={profileForm.firstName}
              onChange={(event) => onProfileChange((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Анна"
            />
            <Field
              label="Фамилия"
              value={profileForm.lastName}
              onChange={(event) => onProfileChange((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Петрова"
            />
          </div>

          <Field
            label="Email"
            type="email"
            value={profileForm.email}
            onChange={() => {}}
            placeholder="admin@platform.local"
            disabled
            hint="Email привязан к учетной записи и не редактируется здесь."
          />

          <FileUploadField
            label="Загрузить аватар"
            accept="image/*"
            onChange={onAvatarUpload}
            disabled={busyKeys.mediaAvatar}
            busy={busyKeys.mediaAvatar}
            hint="После загрузки ссылка появится в поле аватара."
          />

          <button className="button button-primary" type="submit" disabled={busyKeys.profile}>
            {busyKeys.profile ? 'Сохраняем...' : 'Сохранить профиль'}
          </button>
        </form>
      </section>
    </div>
  )
}
