/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearApiToken, setApiAuthHandlers, setApiToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [authenticatedUser, setAuthenticatedUser] = useState(null)
  const [viewAsRole, setViewAsRole] = useState('')
  const [loading, setLoading] = useState(false)

  const clearSession = useCallback(() => {
    clearApiToken()
    setToken(null)
    setAuthenticatedUser(null)
    setViewAsRole('')
    setLoading(false)
  }, [])

  useEffect(() => {
    setApiAuthHandlers({
      onUnauthorized: () => {
        clearSession()
      },
    })

    return () => {
      setApiAuthHandlers()
    }
  }, [clearSession])

  const user = useMemo(() => {
    if (!authenticatedUser) {
      return null
    }

    if (!viewAsRole) {
      return authenticatedUser
    }

    return {
      ...authenticatedUser,
      role_name: viewAsRole,
    }
  }, [authenticatedUser, viewAsRole])

  const value = useMemo(
    () => ({
      token,
      user,
      authenticatedUser,
      viewAsRole,
      setViewAsRole,
      hasRoleSimulation: Boolean(viewAsRole),
      loading,
      isAuthenticated: Boolean(token),
      async login(email, password) {
        setLoading(true)
        try {
          const { data } = await api.post('/auth/login', {
            email,
            password,
            device_name: 'frontend-web',
          })

          setApiToken(data.data.token)
          setToken(data.data.token)
          setAuthenticatedUser(data.data.user)
          setViewAsRole('')
        } finally {
          setLoading(false)
        }
      },
      async logout() {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignora erro no logout remoto
        }

        clearSession()
      },
    }),
    [authenticatedUser, clearSession, loading, token, user, viewAsRole],
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
