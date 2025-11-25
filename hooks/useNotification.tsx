'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration: number = 5000) => {
      const id = Math.random().toString(36).substring(7)
      const notification: Notification = { id, type, message, duration }

      setNotifications((prev) => [...prev, notification])

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id)
        }, duration)
      }
    },
    [removeNotification]
  )

  const success = useCallback(
    (message: string, duration?: number) => showNotification('success', message, duration),
    [showNotification]
  )

  const error = useCallback(
    (message: string, duration?: number) => showNotification('error', message, duration),
    [showNotification]
  )

  const warning = useCallback(
    (message: string, duration?: number) => showNotification('warning', message, duration),
    [showNotification]
  )

  const info = useCallback(
    (message: string, duration?: number) => showNotification('info', message, duration),
    [showNotification]
  )

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} weight="fill" className="text-green-600" />
      case 'error':
        return <XCircle size={20} weight="fill" className="text-red-600" />
      case 'warning':
        return <Warning size={20} weight="fill" className="text-orange-600" />
      case 'info':
        return <Info size={20} weight="fill" className="text-blue-600" />
    }
  }

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-orange-50 border-orange-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getTextColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-orange-800'
      case 'info':
        return 'text-blue-800'
    }
  }

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`
                ${getBgColor(notification.type)}
                border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px]
              `}
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
              <div className={`flex-1 text-sm font-medium ${getTextColor(notification.type)}`}>
                {notification.message}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors active:scale-[0.95]"
              >
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

