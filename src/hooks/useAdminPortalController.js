import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { ApiError, apiRequest, getStoredAccessToken, setStoredAccessToken, uploadMediaFile } from '../api'
import { readRoute } from '../app/router'
import { adminAuthCopy, adminNavItems, adminShellCopy } from '../adminContent'
import { emptyProfile, flattenCategories, normalizeProfile, toText } from '../helpers'
import {
  buildAdminStats,
  buildModerationBuckets,
  buildModerationQueue,
  buildVendorLabel,
  buildVendorInsights,
  getModerationToast,
  LOADING_COPY,
  matchesModerationItem,
  matchesVendorInsight,
  MODERATION_FILTERS,
  normalizeVendorKey,
  PAGE_COPY,
  readModerationState,
  writeModerationState,
} from './adminModel'
import {
  buildOrderAggregations,
  buildVendorOptions,
  filterAdminOrders,
} from './adminOrderModel'

const MAX_CATALOG_PRODUCTS = 800

export function useAdminPortalController() {
  const [route, setRoute] = useState(() => readRoute())
  const [accessToken, setAccessToken] = useState(() => getStoredAccessToken())
  const [sessionStatus, setSessionStatus] = useState('checking')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', inviteToken: '' })
  const [profileForm, setProfileForm] = useState(() => ({ ...emptyProfile }))
  const [categories, setCategories] = useState([])
  const [platformProducts, setPlatformProducts] = useState([])
  const [reviewDisputes, setReviewDisputes] = useState([])
  const [reviewReports, setReviewReports] = useState([])
  const [paymentTopUps, setPaymentTopUps] = useState([])
  const [exchangeRateForm, setExchangeRateForm] = useState({ rubPerUsdt: '' })
  const [adminOrders, setAdminOrders] = useState([])
  const [tariffs, setTariffs] = useState([])
  const [vendorDirectory, setVendorDirectory] = useState([])
  const [vendorTariffs, setVendorTariffs] = useState({})
  const [tariffForm, setTariffForm] = useState({ name: '', commissionPercent: '5' })
  const [tariffAssignmentForm, setTariffAssignmentForm] = useState({ vendorEmail: '', tariffId: '' })
  const [accountWallet, setAccountWallet] = useState(null)
  const [accountTransactions, setAccountTransactions] = useState([])
  const [accountFilters, setAccountFilters] = useState({ ownerType: 'system', ownerId: '', currencyCode: '' })
  const [adminOrderFilters, setAdminOrderFilters] = useState({
    paymentStatus: '',
    fulfillmentStatus: '',
    vendorId: '',
    orderQuery: '',
  })
  const [moderationSearch, setModerationSearch] = useState('')
  const [moderationFilter, setModerationFilter] = useState('attention')
  const [vendorSearch, setVendorSearch] = useState('')
  const [moderationState, setModerationState] = useState(readModerationState)
  const [busyKeys, setBusyKeys] = useState({})
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const pageCopy = PAGE_COPY[route.page] || PAGE_COPY.notFound
  const isAuthorized = Boolean(accessToken)

  const deferredModerationSearch = useDeferredValue(moderationSearch)
  const deferredVendorSearch = useDeferredValue(vendorSearch)

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])
  const categoryLabelById = useMemo(
    () =>
      categoryOptions.reduce((accumulator, category) => {
        accumulator[category.value] = category.label.trim()
        return accumulator
      }, {}),
    [categoryOptions],
  )
  const moderationQueue = useMemo(
    () => buildModerationQueue(platformProducts, moderationState, categoryLabelById),
    [platformProducts, moderationState, categoryLabelById],
  )
  const visibleModerationQueue = useMemo(
    () => moderationQueue.filter((item) => matchesModerationItem(item, deferredModerationSearch, moderationFilter)),
    [moderationQueue, deferredModerationSearch, moderationFilter],
  )
  const stats = useMemo(() => buildAdminStats(platformProducts, moderationQueue), [platformProducts, moderationQueue])
  const moderationBuckets = useMemo(() => buildModerationBuckets(stats), [stats])
  const attentionProducts = useMemo(() => moderationQueue.filter((item) => item.attention).slice(0, 6), [moderationQueue])
  const vendorById = useMemo(() => buildVendorMap(vendorDirectory), [vendorDirectory])
  const vendorByEmail = useMemo(() => buildVendorEmailMap(vendorDirectory), [vendorDirectory])
  const vendorInsights = useMemo(() => buildVendorInsights(moderationQueue, vendorById), [moderationQueue, vendorById])
  const visibleVendorInsights = useMemo(
    () => vendorInsights.filter((item) => matchesVendorInsight(item, deferredVendorSearch)),
    [vendorInsights, deferredVendorSearch],
  )
  const hotVendors = useMemo(() => vendorInsights.slice(0, 6), [vendorInsights])
  const routeModerationItem = useMemo(
    () => moderationQueue.find((item) => item.productId === toText(route.productId)) || null,
    [moderationQueue, route.productId],
  )
  const routeVendorInsight = useMemo(
    () => vendorInsights.find((item) => item.vendorId === normalizeVendorKey(route.vendorId)) || null,
    [route.vendorId, vendorInsights],
  )
  const visibleAdminOrders = useMemo(
    () => filterAdminOrders(adminOrders, adminOrderFilters),
    [adminOrders, adminOrderFilters],
  )
  const adminOrderAggregations = useMemo(() => buildOrderAggregations(visibleAdminOrders), [visibleAdminOrders])
  const adminOrderVendorOptions = useMemo(() => buildVendorOptions(adminOrders), [adminOrders])

  const handleBootstrapEffect = useEffectEvent(() => {
    void bootstrap()
  })

  useEffect(() => {
    handleBootstrapEffect()
  }, [])

  useEffect(() => {
    const syncRoute = () => {
      startTransition(() => {
        setRoute(readRoute())
      })
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    document.title = `${pageCopy.title} | Platform Admin`
  }, [pageCopy.title])

  useEffect(() => {
    writeModerationState(moderationState)
  }, [moderationState])

  async function bootstrap() {
    await Promise.allSettled([loadCategories(), restoreSession()])
  }

  async function restoreSession() {
    const stored = getStoredAccessToken()

    if (!stored) {
      await refreshSession(true)
      return
    }

    try {
      storeAccessToken(stored)
      await hydratePrivate(stored)
    } catch (error) {
      clearAuth()

      if (!(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }

      await refreshSession(true)
    }
  }

  async function loadCategories() {
    try {
      const response = await apiRequest('/api/v1/catalog/categories?include_children=true')
      startTransition(() => {
        setCategories(response.categories || [])
      })
    } catch (error) {
      handleError(error)
    }
  }

  async function hydratePrivate(token) {
    const profile = await fetchProfile(token)
    startTransition(() => {
      setProfileForm(profile)
      setSessionStatus('active')
    })
    await Promise.allSettled([loadPlatformProducts(token), loadVendorDirectory(token), loadReviewDisputes(token), loadReviewReports(token), loadPaymentTopUps(token), loadUSDTExchangeRate(token), loadAdminOrders(token), loadTariffs(token), loadAdminAccounts(token)])
  }

  async function fetchProfile(token) {
    try {
      const response = await apiRequest('/api/v1/admin/auth/me', { token })
      return normalizeProfile(response)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { ...emptyProfile }
      }

      throw error
    }
  }

  async function loadPlatformProducts(token = accessToken) {
    setBusy('catalog', true)

    try {
      const allProducts = []
      let nextPageToken = ''

      for (;;) {
        const params = new URLSearchParams({ page_size: '80' })

        if (nextPageToken) {
          params.set('page_token', nextPageToken)
        }

        const response = await apiRequest(`/api/v1/catalog/products?${params.toString()}`, { token })
        allProducts.push(...(response.products || []))

        if (!response.next_page_token || allProducts.length >= MAX_CATALOG_PRODUCTS) {
          break
        }

        nextPageToken = toText(response.next_page_token)
      }

      startTransition(() => {
        setPlatformProducts(allProducts)
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('catalog', false)
    }
  }

  async function loadReviewDisputes(token = accessToken) {
    setBusy('reviewDisputes', true)

    try {
      const response = await apiRequest('/api/v1/admin/reviews/disputes', { token })
      startTransition(() => {
        setReviewDisputes(response.reviews || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('reviewDisputes', false)
    }
  }

  async function loadReviewReports(token = accessToken) {
    setBusy('reviewReports', true)

    try {
      const response = await apiRequest('/api/v1/admin/reviews/reports', { token })
      startTransition(() => {
        setReviewReports(response.items || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('reviewReports', false)
    }
  }

  async function loadPaymentTopUps(token = accessToken) {
    setBusy('paymentTopUps', true)

    try {
      const response = await apiRequest('/api/v1/admin/balance/top-ups?currency_code=1000&provider_type=acquiring&status=pending&limit=100&offset=0', { token })
      startTransition(() => {
        setPaymentTopUps(response.topUps || response.top_ups || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('paymentTopUps', false)
    }
  }

  async function loadUSDTExchangeRate(token = accessToken) {
    setBusy('exchangeRate', true)

    try {
      const response = await apiRequest('/api/v1/admin/catalog/exchange-rates/usdt-trc20', { token })
      setExchangeRateForm({ rubPerUsdt: toText(response.rate?.rubPerUsdt ?? response.rate?.rub_per_usdt) })
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        handleError(error)
      }
    } finally {
      setBusy('exchangeRate', false)
    }
  }

  async function updateUSDTExchangeRate(event) {
    event.preventDefault()
    const rubPerUsdt = exchangeRateForm.rubPerUsdt.trim()
    if (!rubPerUsdt) {
      notify('Укажите курс USDT.', 'warning')
      return
    }

    setBusy('exchangeRateSave', true)
    try {
      const response = await authedRequest('/api/v1/admin/catalog/exchange-rates/usdt-trc20', {
        method: 'PUT',
        body: { rub_per_usdt: rubPerUsdt },
      })
      setExchangeRateForm({ rubPerUsdt: toText(response.rate?.rubPerUsdt ?? response.rate?.rub_per_usdt) })
      notify('Курс USDT сохранен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('exchangeRateSave', false)
    }
  }

  async function loadAdminOrders(token = accessToken, filters = adminOrderFilters) {
    setBusy('adminOrders', true)

    try {
      const params = new URLSearchParams({ limit: '200', offset: '0' })
      if (filters.paymentStatus) {
        params.set('payment_status', filters.paymentStatus)
      }
      if (filters.fulfillmentStatus) {
        params.set('fulfillment_status', filters.fulfillmentStatus)
      }
      const response = await apiRequest(`/api/v1/admin/orders?${params.toString()}`, { token })
      startTransition(() => {
        setAdminOrders(response.orders || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('adminOrders', false)
    }
  }

  async function loadAdminAccounts(token = accessToken, filters = accountFilters) {
    setBusy('accounts', true)

    const ownerType = filters.ownerType || 'system'
    const ownerId = ownerType === 'system' ? '0' : toText(filters.ownerId).trim()
    if (ownerType === 'vendor' && !ownerId) {
      setBusy('accounts', false)
      notify('Укажите vendor_id для просмотра счета.', 'warning')
      return
    }

    const params = new URLSearchParams({
      owner_type: ownerType,
      owner_id: ownerId,
      limit: '50',
      offset: '0',
    })
    if (filters.currencyCode) {
      params.set('currency_code', filters.currencyCode)
    }

    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        apiRequest(`/api/v1/admin/balance/wallet?${params.toString()}`, { token }),
        apiRequest(`/api/v1/admin/balance/transactions?${params.toString()}`, { token }),
      ])

      startTransition(() => {
        setAccountWallet(walletResponse.wallet || null)
        setAccountTransactions(transactionsResponse.transactions || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('accounts', false)
    }
  }

  function updateAccountFilter(key, value) {
    const nextFilters = {
      ...accountFilters,
      [key]: value,
    }
    if (key === 'ownerType' && value === 'system') {
      nextFilters.ownerId = ''
    }
    setAccountFilters(nextFilters)
    if (nextFilters.ownerType === 'system' || toText(nextFilters.ownerId).trim()) {
      void loadAdminAccounts(accessToken, nextFilters)
    }
  }

  async function loadTariffs(token = accessToken) {
    setBusy('tariffs', true)

    try {
      const response = await apiRequest('/api/v1/admin/tariffs', { token })
      startTransition(() => {
        setTariffs(response.tariffs || [])
      })
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('tariffs', false)
    }
  }

  async function loadVendorDirectory(token = accessToken) {
    try {
      const response = await apiRequest('/api/v1/admin/auth/vendors', { token })
      startTransition(() => {
        setVendorDirectory((response.vendors || []).map(normalizeVendorDirectoryItem).filter(Boolean))
      })
    } catch (error) {
      handleError(error)
    }
  }

  async function loadVendorTariff(vendorId, token = accessToken) {
    const normalizedVendorId = toText(vendorId).trim()
    if (!normalizedVendorId) {
      return null
    }

    try {
      const response = await apiRequest(`/api/v1/admin/vendors/${encodeURIComponent(normalizedVendorId)}/tariff`, { token })
      const tariff = response.tariff || null
      startTransition(() => {
        setVendorTariffs((current) => ({ ...current, [normalizedVendorId]: tariff }))
      })
      return tariff
    } catch (error) {
      handleError(error)
      return null
    }
  }

  async function ensureAuthorized() {
    if (accessToken) {
      return accessToken
    }

    const refreshedToken = await refreshSession(true)
    if (refreshedToken) {
      return refreshedToken
    }

    throw new ApiError('Нужна авторизация.', 401)
  }

  async function authedRequest(path, options = {}) {
    const token = options.token || (await ensureAuthorized())
    return apiRequest(path, { ...options, token })
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setBusy('auth', true)

    try {
      const email = authForm.email.trim()
      const password = authForm.password

      if (!email || !password) {
        throw new Error('Введите email и пароль.')
      }

      if (authMode === 'register') {
        const inviteToken = authForm.inviteToken.trim()

        if (!inviteToken) {
          throw new Error('Введите invite token.')
        }

        await apiRequest('/api/v1/admin/auth/register', {
          method: 'POST',
          body: { email, password, invite_token: inviteToken },
        })
      }

      const response = await apiRequest('/api/v1/admin/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      const nextToken = getAccessTokenFromResponse(response, 'Не удалось выполнить вход. Попробуйте еще раз.', 'login')
      storeAccessToken(nextToken)
      setAuthForm((current) => ({ ...current, password: '', inviteToken: '' }))
      await hydratePrivate(nextToken)
      notify(authMode === 'register' ? 'Администратор зарегистрирован, вход выполнен.' : 'Сессия открыта.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('auth', false)
    }
  }

  async function refreshSession(silent = false) {
    setBusy('refresh', true)

    try {
      const response = await apiRequest('/api/v1/admin/auth/refresh', { method: 'POST' })
      const nextToken = getAccessTokenFromResponse(response, 'Не удалось обновить сессию.', 'refresh')
      storeAccessToken(nextToken)
      await hydratePrivate(nextToken)

      if (!silent) {
        notify('Сессия обновлена.', 'success')
      }

      return nextToken
    } catch (error) {
      clearAuth()

      if (!silent && !(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }

      if (!silent && error instanceof ApiError && error.status === 401) {
        notify('Сессия истекла. Войдите снова.', 'warning')
      }

      return ''
    } finally {
      setBusy('refresh', false)
    }
  }

  async function handleLogout() {
    setBusy('logout', true)

    try {
      await apiRequest('/api/v1/admin/auth/logout', { method: 'POST' })
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        handleError(error)
      }
    } finally {
      clearAuth()
      setBusy('logout', false)
    }

    notify('Вы вышли из консоли.', 'info')
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setBusy('profile', true)

    try {
      const response = await authedRequest('/api/v1/users/me', {
        method: 'PATCH',
        body: {
          first_name: profileForm.firstName.trim(),
          last_name: profileForm.lastName.trim(),
          avatar_url: profileForm.avatarUrl.trim(),
        },
      })

      startTransition(() => {
        setProfileForm(normalizeProfile(response))
      })
      notify('Профиль сохранен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('profile', false)
    }
  }

  async function handleProfileAvatarUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setBusy('mediaAvatar', true)

    try {
      const token = await ensureAuthorized()
      const response = await uploadMediaFile(file, { token, directory: 'avatars/admins' })
      const fileUrl = toText(response?.fileUrl ?? response?.file_url).trim()

      if (!fileUrl) {
        throw new Error('Media service не вернул file_url.')
      }

      startTransition(() => {
        setProfileForm((current) => ({ ...current, avatarUrl: fileUrl }))
      })
      notify('Аватар загружен. Сохраните профиль, чтобы применить ссылку.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('mediaAvatar', false)
    }
  }

  async function createCategory({ name: rawName, parentId: rawParentId }) {
    setBusy('categoryCreate', true)

    try {
      const name = toText(rawName).trim()
      const parentId = toText(rawParentId).trim()

      if (!name) {
        throw new Error('Введите название категории.')
      }

      const body = { name }
      if (parentId) {
        const numericParentId = Number(parentId)
        if (!Number.isSafeInteger(numericParentId) || numericParentId <= 0) {
          throw new Error('Выберите корректную родительскую категорию.')
        }

        body.parent_id = numericParentId
      }

      await authedRequest('/api/v1/admin/catalog/categories', {
        method: 'POST',
        body,
      })

      await loadCategories()
      notify('Категория добавлена.', 'success')
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setBusy('categoryCreate', false)
    }
  }

  async function deleteCategory(categoryId) {
    const normalizedCategoryId = toText(categoryId).trim()
    if (!normalizedCategoryId) {
      return
    }

    setBusy(`categoryDelete:${normalizedCategoryId}`, true)

    try {
      await authedRequest(`/api/v1/admin/catalog/categories/${normalizedCategoryId}`, {
        method: 'DELETE',
      })

      await loadCategories()
      notify('Категория удалена.', 'success')
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setBusy(`categoryDelete:${normalizedCategoryId}`, false)
    }
  }

  function setModerationDecision(productId, decision) {
    const normalizedProductId = toText(productId)

    setModerationState((current) => ({
      ...current,
      [normalizedProductId]: {
        note: toText(current[normalizedProductId]?.note),
        status: decision,
        updatedAt: new Date().toISOString(),
      },
    }))

    notify(getModerationToast(decision), decision === 'rejected' ? 'warning' : 'success')
  }

  function setModerationNote(productId, note) {
    const normalizedProductId = toText(productId)

    setModerationState((current) => ({
      ...current,
      [normalizedProductId]: {
        note: toText(note),
        status: current[normalizedProductId]?.status || 'pending',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  function openModeration() {
    navigate('/moderation')
  }

  function openModerationProduct(productId) {
    navigate(`/moderation/${encodeURIComponent(toText(productId))}`)
  }

  function openVendorProfile(vendorId) {
    const normalizedVendorId = normalizeVendorKey(vendorId)
    void loadVendorTariff(normalizedVendorId)
    navigate(`/vendors/${encodeURIComponent(normalizedVendorId)}`)
  }

  async function resolveReviewDispute(review, decision) {
    const reviewId = toText(review?.id)
    const disputeId = toText(review?.dispute?.id)
    if (!reviewId || !disputeId) {
      notify('Не удалось определить спорный отзыв.', 'warning')
      return
    }

    setBusy(`reviewResolve-${reviewId}`, true)

    try {
      const response = await authedRequest(`/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/disputes/${encodeURIComponent(disputeId)}/resolve`, {
        method: 'POST',
        body: { decision, comment: '' },
      })
      startTransition(() => {
        setReviewDisputes((current) => current.filter((item) => toText(item?.id) !== reviewId))
      })
      notify(decision === 'accepted' ? 'Отзыв исключен из рейтинга.' : 'Спор отклонен.', 'success')
      return response
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`reviewResolve-${reviewId}`, false)
    }
  }

  async function deleteReview(reviewId) {
    const normalizedReviewId = toText(reviewId)
    if (!normalizedReviewId) {
      return
    }

    setBusy(`reviewDelete-${normalizedReviewId}`, true)

    try {
      await authedRequest(`/api/v1/admin/reviews/${encodeURIComponent(normalizedReviewId)}`, {
        method: 'DELETE',
      })
      startTransition(() => {
        setReviewDisputes((current) => current.filter((item) => toText(item?.id) !== normalizedReviewId))
        setReviewReports((current) => current.filter((item) => toText(item?.review?.id) !== normalizedReviewId))
      })
      notify('Отзыв удален.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`reviewDelete-${normalizedReviewId}`, false)
    }
  }

  async function confirmPaymentTopUp(externalId) {
    const normalizedExternalId = toText(externalId).trim()
    if (!normalizedExternalId) {
      notify('Не удалось определить платеж.', 'warning')
      return
    }

    setBusy(`paymentConfirm-${normalizedExternalId}`, true)

    try {
      await authedRequest(`/api/v1/admin/balance/top-ups/${encodeURIComponent(normalizedExternalId)}/confirm`, {
        method: 'POST',
      })
      startTransition(() => {
        setPaymentTopUps((current) => current.filter((item) => toText(item?.externalId ?? item?.external_id) !== normalizedExternalId))
      })
      notify('Платеж подтвержден.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`paymentConfirm-${normalizedExternalId}`, false)
    }
  }

  async function createTariff(event) {
    event.preventDefault()
    const name = tariffForm.name.trim()
    const commissionPercent = tariffForm.commissionPercent.trim()
    if (!name || !commissionPercent) {
      notify('Введите название тарифа и процент комиссии.', 'warning')
      return
    }

    setBusy('tariffCreate', true)
    try {
      await authedRequest('/api/v1/admin/tariffs', {
        method: 'POST',
        body: { name, commission_percent: commissionPercent },
      })
      startTransition(() => {
        setTariffForm({ name: '', commissionPercent: '5' })
      })
      await loadTariffs()
      notify('Тариф создан.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('tariffCreate', false)
    }
  }

  async function updateTariff(event, tariff) {
    event.preventDefault()
    const tariffId = toText(tariff?.id).trim()
    if (!tariffId) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const name = toText(formData.get('name')).trim()
    const commissionPercent = toText(formData.get('commission_percent')).trim()
    if (!name || !commissionPercent) {
      notify('Введите название тарифа и процент комиссии.', 'warning')
      return
    }

    setBusy(`tariffUpdate-${tariffId}`, true)
    try {
      await authedRequest(`/api/v1/admin/tariffs/${encodeURIComponent(tariffId)}`, {
        method: 'PATCH',
        body: { name, commission_percent: commissionPercent },
      })
      await loadTariffs()
      notify('Тариф обновлен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`tariffUpdate-${tariffId}`, false)
    }
  }

  async function setDefaultTariff(tariffId) {
    const normalizedTariffId = toText(tariffId).trim()
    if (!normalizedTariffId) {
      return
    }

    setBusy(`tariffDefault-${normalizedTariffId}`, true)
    try {
      await authedRequest(`/api/v1/admin/tariffs/${encodeURIComponent(normalizedTariffId)}/default`, {
        method: 'PATCH',
      })
      await loadTariffs()
      notify('Дефолтный тариф обновлен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`tariffDefault-${normalizedTariffId}`, false)
    }
  }

  async function assignVendorTariff(eventOrVendorId, maybeTariffId) {
    const isSubmitEvent = Boolean(eventOrVendorId?.preventDefault)
    if (isSubmitEvent) {
      eventOrVendorId.preventDefault()
    }

    const vendorId = resolveVendorId(isSubmitEvent ? tariffAssignmentForm.vendorEmail : eventOrVendorId)
    const tariffId = toText(isSubmitEvent ? tariffAssignmentForm.tariffId : maybeTariffId).trim()
    if (!vendorId || !tariffId) {
      notify('Укажите email вендора и тариф.', 'warning')
      return
    }

    setBusy('tariffAssign', true)
    setBusy(`vendorTariff-${vendorId}`, true)
    try {
      const response = await authedRequest(`/api/v1/admin/vendors/${encodeURIComponent(vendorId)}/tariff`, {
        method: 'PUT',
        body: { tariff_id: Number(tariffId) },
      })
      startTransition(() => {
        setVendorTariffs((current) => ({ ...current, [vendorId]: response.tariff || null }))
        if (isSubmitEvent) {
          setTariffAssignmentForm({ vendorEmail: '', tariffId: '' })
        }
      })
      await loadTariffs()
      notify('Тариф назначен вендору.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy('tariffAssign', false)
      setBusy(`vendorTariff-${vendorId}`, false)
    }
  }

  function resolveVendorId(value) {
    const raw = toText(value).trim()
    const vendor = vendorByEmail[raw.toLowerCase()]
    if (vendor?.id) {
      return vendor.id
    }

    if (/^\d+$/.test(raw)) {
      return raw
    }

    return ''
  }

  function changeAdminOrderFilter(key, value) {
    const nextFilters = { ...adminOrderFilters, [key]: value }
    startTransition(() => {
      setAdminOrderFilters(nextFilters)
    })

    if (key === 'paymentStatus' || key === 'fulfillmentStatus') {
      void loadAdminOrders(accessToken, nextFilters)
    }
  }

  async function updateAdminOrderPaymentStatus(orderId, paymentStatus) {
    const normalizedOrderId = toText(orderId).trim()
    const normalizedStatus = toText(paymentStatus).trim()
    if (!normalizedOrderId || !normalizedStatus) {
      notify('Не удалось обновить статус оплаты.', 'warning')
      return
    }

    setBusy(`adminOrderPayment-${normalizedOrderId}`, true)

    try {
      const response = await authedRequest(`/api/v1/admin/orders/${encodeURIComponent(normalizedOrderId)}/payment-status`, {
        method: 'PATCH',
        body: { payment_status: normalizedStatus },
      })
      const updatedOrder = response.order
      startTransition(() => {
        setAdminOrders((current) => current.map((order) => (toText(order?.id) === normalizedOrderId ? updatedOrder || order : order)))
      })
      notify('Статус оплаты обновлен.', 'success')
    } catch (error) {
      handleError(error)
    } finally {
      setBusy(`adminOrderPayment-${normalizedOrderId}`, false)
    }
  }

  function navigate(path) {
    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)
    startTransition(() => {
      setRoute(readRoute())
    })
  }

  function storeAccessToken(token) {
    setStoredAccessToken(token)
    setAccessToken(token)
  }

  function clearAuth() {
    storeAccessToken('')
    setSessionStatus('guest')
    startTransition(() => {
      setProfileForm({ ...emptyProfile, email: authForm.email.trim() })
      setPlatformProducts([])
      setReviewDisputes([])
      setReviewReports([])
      setPaymentTopUps([])
      setAdminOrders([])
      setAccountWallet(null)
      setAccountTransactions([])
      setAccountFilters({ ownerType: 'system', ownerId: '', currencyCode: '' })
      setTariffs([])
      setVendorTariffs({})
    })
  }

  function setBusy(key, value) {
    setBusyKeys((current) => {
      const next = { ...current }

      if (value) {
        next[key] = true
      } else {
        delete next[key]
      }

      return next
    })
  }

  function notify(message, type = 'info') {
    const id = toastIdRef.current + 1
    toastIdRef.current = id
    setToasts((current) => [...current, { id, message, type }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }

  function handleError(error) {
    if (error instanceof ApiError) {
      notify(error.message, error.status >= 500 ? 'error' : 'warning')
      return
    }

    if (error instanceof Error) {
      notify(error.message, 'warning')
      return
    }

    notify('Произошла непредвиденная ошибка.', 'error')
  }

  return {
    route,
    isAuthorized,
    sessionStatus,
    toasts,
    loadingCopy: LOADING_COPY,
    authProps: {
      authMode,
      authForm,
      busyKeys,
      copy: adminAuthCopy,
      onAuthModeChange: setAuthMode,
      onAuthFormChange: setAuthForm,
      onAuthSubmit: handleAuthSubmit,
    },
    shellProps: {
      sidebar: {
        navItems: adminNavItems,
        currentPage: route.page === 'vendorProfile' ? 'vendors' : route.page === 'moderationProduct' ? 'moderation' : route.page,
        profileName: profileForm.firstName || profileForm.email || 'Admin',
        onNavigate: navigate,
        brandBadge: adminShellCopy.brandBadge,
        brandTitle: adminShellCopy.brandTitle,
        brandSubtitle: adminShellCopy.brandSubtitle,
        logoutLabel: adminShellCopy.logoutLabel,
        busyKeys,
        onLogout: handleLogout,
      },
    },
    pageProps: {
      dashboard: {
        stats,
        moderationBuckets,
        hotVendors,
        attentionProducts,
        onOpenModeration: openModeration,
        onOpenVendors: () => navigate('/vendors'),
        onInspectProduct: openModerationProduct,
        onInspectVendor: openVendorProfile,
      },
      moderation: {
        queue: visibleModerationQueue,
        filters: MODERATION_FILTERS,
        search: moderationSearch,
        filter: moderationFilter,
        categoryLabelById,
        onSearchChange: setModerationSearch,
        onFilterChange: setModerationFilter,
        onOpenProduct: openModerationProduct,
      },
      reviews: {
        reviews: reviewDisputes,
        reports: reviewReports,
        busyKeys,
        onReload: () => Promise.allSettled([loadReviewDisputes(), loadReviewReports()]),
        onAccept: (review) => resolveReviewDispute(review, 'accepted'),
        onReject: (review) => resolveReviewDispute(review, 'rejected'),
        onDelete: deleteReview,
      },
      payments: {
        topUps: paymentTopUps,
        exchangeRateForm,
        busyKeys,
        onExchangeRateChange: setExchangeRateForm,
        onExchangeRateSave: updateUSDTExchangeRate,
        onReload: () => Promise.allSettled([loadPaymentTopUps(), loadUSDTExchangeRate()]),
        onConfirm: confirmPaymentTopUp,
      },
      accounts: {
        wallet: accountWallet,
        transactions: accountTransactions,
        filters: accountFilters,
        busyKeys,
        onFilterChange: updateAccountFilter,
        onLoad: () => loadAdminAccounts(),
      },
      orders: {
        orders: visibleAdminOrders,
        aggregations: adminOrderAggregations,
        vendorOptions: adminOrderVendorOptions,
        filters: adminOrderFilters,
        busyKeys,
        onFilterChange: changeAdminOrderFilter,
        onReload: () => loadAdminOrders(),
        onPaymentStatusChange: updateAdminOrderPaymentStatus,
      },
      tariffs: {
        tariffs,
        tariffForm,
        assignmentForm: tariffAssignmentForm,
        vendorOptions: vendorDirectory,
        busyKeys,
        onTariffFormChange: setTariffForm,
        onAssignmentFormChange: setTariffAssignmentForm,
        onCreateTariff: createTariff,
        onUpdateTariff: updateTariff,
        onSetDefaultTariff: setDefaultTariff,
        onAssignVendorTariff: assignVendorTariff,
      },
      moderationProduct: {
        item: routeModerationItem,
        productId: route.productId,
        categoryLabelById,
        onBack: () => navigate('/moderation'),
        onSetDecision: setModerationDecision,
        onChangeNote: setModerationNote,
        onOpenVendor: openVendorProfile,
      },
      categories: {
        categories,
        categoryOptions,
        busyKeys,
        onCreateCategory: createCategory,
        onDeleteCategory: deleteCategory,
      },
      vendors: {
        vendors: visibleVendorInsights,
        vendorOptions: vendorDirectory,
        search: vendorSearch,
        onSearchChange: setVendorSearch,
        onOpenVendor: openVendorProfile,
      },
      vendorProfile: {
        vendor: routeVendorInsight,
        vendorId: route.vendorId,
        vendorTitle: buildVendorLabel(route.vendorId, vendorById[normalizeVendorKey(route.vendorId)]),
        tariffs,
        currentTariff: vendorTariffs[normalizeVendorKey(route.vendorId)] || null,
        busyKeys,
        onBack: () => navigate('/vendors'),
        onInspectProduct: openModerationProduct,
        onAssignTariff: assignVendorTariff,
      },
      profile: {
        profileForm,
        busyKeys,
        onProfileChange: setProfileForm,
        onProfileSubmit: handleProfileSubmit,
        onAvatarUpload: handleProfileAvatarUpload,
      },
      notFound: {
        title: pageCopy.title,
        buttonLabel: pageCopy.buttonLabel,
        onGoDashboard: () => navigate('/'),
      },
    },
  }
}

function getAccessTokenFromResponse(response, failureMessage, operation) {
  const accessToken = toText(response?.accessToken ?? response?.access_token).trim()
  if (accessToken) {
    return accessToken
  }

  console.error(`Missing access token in ${operation} response.`, response)
  throw new Error(failureMessage)
}

function normalizeVendorDirectoryItem(item) {
  const id = toText(item?.id ?? item?.vendor_id ?? item?.vendorId).trim()
  const email = toText(item?.email).trim()
  if (!id || !email) {
    return null
  }

  return { id, email }
}

function buildVendorMap(vendors) {
  return vendors.reduce((accumulator, vendor) => {
    accumulator[vendor.id] = vendor
    return accumulator
  }, {})
}

function buildVendorEmailMap(vendors) {
  return vendors.reduce((accumulator, vendor) => {
    accumulator[vendor.email.toLowerCase()] = vendor
    return accumulator
  }, {})
}
