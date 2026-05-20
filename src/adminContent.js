export const adminNavItems = [
  { path: '/', page: 'dashboard', label: 'Обзор' },
  { path: '/moderation', page: 'moderation', label: 'Модерация' },
  { path: '/reviews', page: 'reviews', label: 'Отзывы' },
  { path: '/payments', page: 'payments', label: 'Платежи' },
  { path: '/orders', page: 'orders', label: 'Заказы' },
  { path: '/tariffs', page: 'tariffs', label: 'Тарифы' },
  { path: '/categories', page: 'categories', label: 'Категории' },
  { path: '/vendors', page: 'vendors', label: 'Вендоры' },
  { path: '/profile', page: 'profile', label: 'Профиль' },
]

export const adminAuthCopy = {
  eyebrow: 'platform admin',
  title: 'Операционный центр платформы для сотрудников: модерация, контроль каталога и обзор витрины.',
  description:
    'Админский интерфейс собран вокруг работы сотрудников платформы: проверка карточек, срез по вендорам, статистика каталога и контроль качества наполнения.',
  highlights: [
    'Единая очередь модерации товарных карточек.',
    'Сводка по всему каталогу, вендорам и проблемным зонам.',
    'Фронтенд вынесен в отдельный проект и готов к собственному циклу разработки.',
  ],
  panelEyebrow: 'staff access',
  loginTitle: 'Вход для сотрудников платформы',
  registerTitle: 'Регистрация администратора',
  emailPlaceholder: 'admin@platform.local',
  passwordPlaceholder: 'Введите служебный пароль',
  inviteTokenPlaceholder: 'Вставьте invite token',
  loginButton: 'Открыть admin console',
  registerButton: 'Зарегистрироваться',
  switchLoginPrompt: 'Нет аккаунта администратора?',
  switchRegisterPrompt: 'Уже есть аккаунт?',
  switchToRegisterLabel: 'Создать',
  switchToLoginLabel: 'Войти',
  allowRegistration: true,
}

export const adminShellCopy = {
  brandTitle: 'Platform Admin',
  brandBadge: 'A',
  ctaEyebrow: 'контроль',
  ctaTitle: 'Очередь модерации',
  ctaDescription: 'Перейдите к проверке каталога, чтобы быстро разобрать карточки с рисками и пустыми данными.',
  primaryActionLabel: 'Открыть модерацию',
  topbarEyebrow: 'admin deck',
  sessionLabel: 'Сессия',
  refreshLabel: 'Обновить сессию',
  refreshingLabel: 'Обновляем...',
  logoutLabel: 'Выйти',
}
