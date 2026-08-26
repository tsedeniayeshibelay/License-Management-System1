import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function NotificationBell({ className = '' }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const prevCountRef = useRef(0)

  // Fetch full notifications list and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await api.get('/notifications')
      if (res.data) {
        setNotifications(res.data.notifications || [])
        const count = res.data.unreadCount || 0
        setUnreadCount(count)
        prevCountRef.current = count
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Lightweight poll for unread badge count & desktop push trigger
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      if (res.data && typeof res.data.unreadCount === 'number') {
        const newCount = res.data.unreadCount
        if (newCount > prevCountRef.current && prevCountRef.current > 0) {
          try {
            let isPushEnabled = false
            const comp = JSON.parse(localStorage.getItem('company_notification_prefs') || '{}')
            if (comp?.browser) isPushEnabled = true
            const cust = JSON.parse(localStorage.getItem('customer_preferences') || '{}')
            if (cust?.notifications?.push) isPushEnabled = true
            const bb = JSON.parse(localStorage.getItem('bulkbuyer_preferences') || '{}')
            if (bb?.notifications?.push) isPushEnabled = true

            if (isPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification("LockStrata Alert", {
                body: `You have new real-time notifications. Total unread: ${newCount}.`,
                icon: '/favicon.ico'
              })
            }
          } catch (e) {}
        }
        prevCountRef.current = newCount
        setUnreadCount(newCount)
      }
    } catch (err) {
      // silent fail during background poll
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (nextState) {
      fetchNotifications()
    }
  }

  const handleMarkAsRead = async (item, e) => {
    if (e) e.stopPropagation()
    if (!item.isRead) {
      try {
        await api.patch(`/notifications/${item.id}/read`)
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Failed to mark notification read:', err)
      }
    }
    if (item.linkUrl) {
      setIsOpen(false)
      navigate(item.linkUrl)
    }
  }

  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation()
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications read:', err)
    }
  }

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await api.delete(`/notifications/${id}`)
      const deletedItem = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (deletedItem && !deletedItem.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch (e) {
      return 'Recently'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'UNBIND_UPDATE':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'LICENSE_ACTIVATION':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'DEVICE_ACTIVATION':
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'FAILED_ACTIVATION':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      case 'SECURITY_ALERT':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )
      case 'LICENSE_EXPIRATION':
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        )
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="text-slate-400 hover:text-white dark:text-slate-400 dark:hover:text-white relative p-1.5 rounded-lg transition-colors focus:outline-none hover:bg-slate-800/50"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Dynamic Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white dark:border-slate-950 shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-1">No new notifications at this time.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => handleMarkAsRead(item, e)}
                  className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer group ${
                    item.isRead
                      ? 'bg-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/40 opacity-75'
                      : 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20'
                  }`}
                >
                  {getTypeIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${item.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0 pt-0.5">
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" title="Unread"></span>
                    )}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity rounded"
                      title="Delete notification"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
