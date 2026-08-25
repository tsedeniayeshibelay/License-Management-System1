import React, { createContext, useState, useEffect } from 'react'
import api from '../services/api'

export const AuthContext = createContext()

const parseTimeoutMs = (timeoutStr) => {
  switch (timeoutStr) {
    case '15 minutes':
      return 15 * 60 * 1000
    case '30 minutes':
      return 30 * 60 * 1000
    case '1 hour':
      return 60 * 60 * 1000
    case '4 hours':
      return 4 * 60 * 60 * 1000
    default:
      return 30 * 60 * 1000
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const res = await api.get('/users/profile')
          setUser(res.data)
          if (res.data.preferences) {
            try {
              const prefs = JSON.parse(res.data.preferences)
              const timeout = prefs?.security?.sessionTimeout || prefs?.sessionTimeout
              if (timeout) {
                localStorage.setItem('session_timeout', timeout)
              }
            } catch (e) {}
          }
        } catch (error) {
          localStorage.removeItem('token')
          setUser(null)
        }
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('last_active_timestamp', Date.now().toString())
    setUser(userData)
  }

  const logout = (reason) => {
    localStorage.removeItem('token')
    localStorage.removeItem('last_active_timestamp')
    setUser(null)
    if (reason === 'inactivity') {
      window.location.href = '/login?reason=inactivity'
    } else {
      window.location.href = '/login'
    }
  }

  // Session inactivity tracker across browser tabs
  useEffect(() => {
    if (!user) return

    if (!localStorage.getItem('last_active_timestamp')) {
      localStorage.setItem('last_active_timestamp', Date.now().toString())
    }

    let lastWriteTime = 0
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastWriteTime > 3000) {
        lastWriteTime = now
        localStorage.setItem('last_active_timestamp', now.toString())
      }
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))
    window.addEventListener('mousemove', handleActivity, { passive: true })

    const interval = setInterval(() => {
      const token = localStorage.getItem('token')
      if (!token) return

      const lastActiveStr = localStorage.getItem('last_active_timestamp')
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10)
        const currentTimeoutStr = localStorage.getItem('session_timeout') || '30 minutes'
        const timeoutMs = parseTimeoutMs(currentTimeoutStr)

        if (Date.now() - lastActive >= timeoutMs) {
          logout('inactivity')
        }
      }
    }, 5000)

    const handleStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null)
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity))
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
