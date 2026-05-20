const ACCESS_TOKEN_KEY = 'marketplace.admin.access_token'
const DEFAULT_API_BASE_URL = 'https://marketplace.vitalmeuble.online'
const ACCESS_TOKEN_HEADER = 'x-access-token'

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

export function setStoredAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  const resolvedToken = getStoredAccessToken() || token

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  let payload = null

  if (contentType.includes('application/json')) {
    payload = await response.json()
  } else {
    const text = await response.text()
    payload = text ? { message: text } : null
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error || `HTTP ${response.status}`, response.status, payload)
  }

  syncAccessTokenFromResponse(response)

  return payload || {}
}

export async function uploadMediaFile(file, { token, directory = 'uploads' } = {}) {
  const formData = new FormData()
  const resolvedToken = getStoredAccessToken() || token
  formData.append('file', file)

  if (directory) {
    formData.append('directory', directory)
  }

  const headers = {}
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/media/upload`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error || `HTTP ${response.status}`, response.status, payload)
  }

  syncAccessTokenFromResponse(response)

  return payload || {}
}

function syncAccessTokenFromResponse(response) {
  const accessToken = response.headers.get(ACCESS_TOKEN_HEADER)?.trim()
  if (accessToken) {
    setStoredAccessToken(accessToken)
  }
}
