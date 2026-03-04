/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)

const USER_KEY = 'sistema_escolar_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!token) {
      return
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.data.user)
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      async login(email, password) {
        setLoading(true)
        const { data } = await api.post('/auth/login', {
          email,
          password,
          device_name: 'frontend-web',
        })

        localStorage.setItem(TOKEN_KEY, data.data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user))
        setToken(data.data.token)
        setUser(data.data.user)
      },
      async logout() {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignora erro no logout remoto
        }

        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
        setLoading(false)
      },
    }),
    [token, user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de AuthProvider')
  }

  return context
}
