import axios from 'axios'

// Resolve API base URL. If VITE_API_URL was accidentally baked in as http://
// while the page is served over https://, upgrade it — otherwise the browser
// blocks the request as mixed content / CSP violation.
const resolveApiBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || '/api'
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    raw.startsWith('http://')
  ) {
    return raw.replace(/^http:\/\//, 'https://')
  }
  return raw
}

const API_BASE_URL = resolveApiBaseUrl()

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page and not during initial auth check
      const isLoginPage = window.location.pathname === '/login'
      const isAuthCheck = error.config?.url?.includes('/auth/me')
      if (!isLoginPage && !isAuthCheck) {
        sessionStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
