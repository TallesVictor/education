import axios from 'axios'

let inMemoryToken = null
let unauthorizedHandler = null
let forbiddenHandler = null

export function setApiToken(token) {
  inMemoryToken = token || null
}

export function clearApiToken() {
  inMemoryToken = null
}

export function setApiAuthHandlers({ onUnauthorized, onForbidden } = {}) {
  unauthorizedHandler = typeof onUnauthorized === 'function' ? onUnauthorized : null
  forbiddenHandler = typeof onForbidden === 'function' ? onForbidden : null
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401 && unauthorizedHandler) {
      unauthorizedHandler(error)
    }

    if (status === 403 && forbiddenHandler) {
      forbiddenHandler(error)
    }

    return Promise.reject(error)
  },
)
