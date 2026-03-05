/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

let toastCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (type, message) => {
      const id = ++toastCounter
      setToasts((current) => [...current, { id, type, message }])

      window.setTimeout(() => {
        removeToast(id)
      }, 3500)
    },
    [removeToast],
  )

  const value = useMemo(
    () => ({
      success(message) {
        pushToast('success', message)
      },
      error(message) {
        pushToast('error', message)
      },
      info(message) {
        pushToast('info', message)
      },
    }),
    [pushToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => removeToast(toast.id)}>
              Fechar
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast precisa ser usado dentro de ToastProvider')
  }

  return context
}
