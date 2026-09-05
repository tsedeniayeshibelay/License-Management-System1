import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import TwoFactorSetupModal from '../components/TwoFactorSetupModal'
import ManageSessionsModal from '../components/ManageSessionsModal'
import DeleteAccountModal from '../components/DeleteAccountModal'
import { DocumentationModal, ContactSupportModal, SystemStatusModal, FAQModal } from '../components/SupportModals'
import { applyAccentColor } from '../utils/accentColor'

function BulkBuyerSettings({ userName, userRole }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Layout state
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'General')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Settings State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'Dark'
    if (saved === 'light') return 'Light'
    return 'System'
  })
  const [accentColor, setAccentColor] = useState('blue')
  const [fontSize, setFontSize] = useState('Standard (Inter 14px)')
  
  const [dashboardPrefs, setDashboardPrefs] = useState({
    landingPage: 'Dashboard',
    dataDensity: 'Comfortable',
    showQuickActions: true
  })

  const [emailAddress, setEmailAddress] = useState('')
  const [emailError, setEmailError] = useState('')
  const [notifSavedMsg, setNotifSavedMsg] = useState('')
  const [testingAlertKey, setTestingAlertKey] = useState('')

  const [notifications, setNotifications] = useState({
    expiration: true,
    assignment: true,
    revocation: true,
    activity: true,
    purchases: true,
    security: true,
    email: true,
    push: true
  })
  const [companyProfile, setCompanyProfile] = useState({
    name: 'Loading...',
    email: 'Loading...',
    phone: 'Loading...',
    webhookUrl: ''
  })
  const [userProfile, setUserProfile] = useState({ email: '', twoFactorEnabled: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Security & Sessions State
  const [security, setSecurity] = useState({
    twoFactor: true,
    loginAlerts: true,
    sessionTimeout: '30 minutes'
  })
  const [privacy, setPrivacy] = useState({
    allowAnalytics: true
  })
  const [knownDevices, setKnownDevices] = useState([])
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('')
  const [securitySavedMsg, setSecuritySavedMsg] = useState('')

  // Privacy & Support Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [privacySavedMsg, setPrivacySavedMsg] = useState('')

  const refreshDevices = async () => {
    try {
      const devRes = await api.get('/users/profile/devices')
      setKnownDevices(devRes.data || [])
    } catch (e) {
      console.error('Failed to fetch devices', e)
    }
  }
  
  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const [res, userRes, devRes] = await Promise.all([
          api.get('/bulk-buyer/settings'),
          api.get('/users/profile'),
          api.get('/users/profile/devices').catch(() => ({ data: [] }))
        ])
        setCompanyProfile(res.data)
        setUserProfile({
          email: userRes.data.email,
          twoFactorEnabled: userRes.data.twoFactorEnabled || false
        })
        setKnownDevices(devRes.data || [])
        let userEmail = userRes.data.email || ''
        if (userRes.data.preferences) {
          try {
            const prefs = JSON.parse(userRes.data.preferences)
            if (prefs.theme) setTheme(prefs.theme)
            if (prefs.accentColor) setAccentColor(prefs.accentColor)
            if (prefs.fontSize) setFontSize(prefs.fontSize)
            if (prefs.dashboardPrefs) setDashboardPrefs(prefs.dashboardPrefs)
            if (prefs.notifications) {
              const { sms, ...cleanNotifs } = prefs.notifications
              setNotifications(prev => ({ ...prev, ...cleanNotifs }))
              if (cleanNotifs.emailAddress) {
                userEmail = cleanNotifs.emailAddress
              }
            }
            if (prefs.teamPreferences) setTeamPreferences(prefs.teamPreferences)
            if (prefs.licenseManagement) setLicenseManagement(prefs.licenseManagement)
            if (prefs.security) {
              setSecurity(prev => ({
                ...prev,
                loginAlerts: prefs.security.loginAlerts !== undefined ? prefs.security.loginAlerts : true,
                sessionTimeout: prefs.security.sessionTimeout || '30 minutes'
              }))
            }
            if (prefs.privacy) setPrivacy(prefs.privacy)
          } catch (e) {
            console.error('Failed to parse preferences', e)
          }
        }
        setEmailAddress(userEmail)
      } catch (err) {
        console.error('Failed to fetch settings', err)
        setError('Failed to load settings.')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const buildCleanPreferences = (notifOverrides = {}, emailOverride = null) => {
    const notifs = { ...notifications, ...notifOverrides }
    delete notifs.sms
    const emailToPersist = emailOverride !== null ? emailOverride : emailAddress
    if (emailToPersist && emailToPersist.trim()) {
      notifs.emailAddress = emailToPersist.trim()
    } else if (userProfile.email) {
      notifs.emailAddress = userProfile.email
    }
    return {
      theme,
      accentColor,
      fontSize,
      dashboardPrefs,
      notifications: notifs,
      teamPreferences,
      licenseManagement,
      security: {
        loginAlerts: security.loginAlerts !== undefined ? security.loginAlerts : true,
        sessionTimeout: security.sessionTimeout || '30 minutes'
      },
      privacy
    }
  }

  const validateEmail = (val) => {
    if (!val || !val.trim()) return false
    return /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(val.trim())
  }

  const handleToggleNotification = async (key) => {
    const nextVal = !notifications[key]
    const updated = {
      ...notifications,
      [key]: nextVal
    }
    delete updated.sms
    setNotifications(updated)
    setPrefSaving(true)
    try {
      const prefs = buildCleanPreferences({ [key]: nextVal })
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setNotifSavedMsg('Notification preference updated & active!')
      setTimeout(() => setNotifSavedMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update notification preference', err)
      setNotifications(notifications)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleToggleBrowserPush = async () => {
    if (!notifications.push) {
      if (!('Notification' in window)) {
        alert('Browser push notifications are not supported in this browser.')
        return
      }
      let perm = Notification.permission
      if (perm !== 'granted') {
        perm = await Notification.requestPermission()
      }
      if (perm === 'granted') {
        const updated = { ...notifications, push: true }
        delete updated.sms
        setNotifications(updated)
        try {
          new Notification("LockStrata Push Notifications Enabled", {
            body: "Real-time desktop alerts are now active for this browser.",
            icon: "/favicon.ico"
          })
        } catch (e) {}
        try {
          const prefs = buildCleanPreferences({ push: true })
          await api.put('/users/profile', {
            fullName: companyProfile.name || 'Bulk Buyer',
            preferences: JSON.stringify(prefs)
          })
          setNotifSavedMsg('Browser notifications enabled & verified!')
          setTimeout(() => setNotifSavedMsg(''), 3000)
        } catch (err) {
          console.error(err)
        }
      } else {
        alert('Browser notification permission was not granted. Please allow notifications in your browser address bar.')
      }
    } else {
      const updated = { ...notifications, push: false }
      delete updated.sms
      setNotifications(updated)
      try {
        const prefs = buildCleanPreferences({ push: false })
        await api.put('/users/profile', {
          fullName: companyProfile.name || 'Bulk Buyer',
          preferences: JSON.stringify(prefs)
        })
        setNotifSavedMsg('Browser notifications disabled.')
        setTimeout(() => setNotifSavedMsg(''), 3000)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleSaveEmailAddress = async () => {
    if (!validateEmail(emailAddress)) {
      setEmailError('Please enter a valid email address (e.g. user@example.com)')
      return
    }
    setEmailError('')
    setPrefSaving(true)
    try {
      const prefs = buildCleanPreferences({}, emailAddress.trim())
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setNotifSavedMsg('Notification email address saved!')
      setTimeout(() => setNotifSavedMsg(''), 3000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save notification email.'
      setEmailError(msg)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleSendTestAlert = async (eventKey = 'expiration') => {
    setTestingAlertKey(eventKey)
    try {
      const res = await api.post(`/notifications/test?eventKey=${eventKey}`)
      if (res.data.success) {
        setNotifSavedMsg(`Test alert for '${eventKey}' sent! Check your notification bell and alerts.`)
        if (notifications.push && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`LockStrata Alert: ${eventKey.toUpperCase()}`, {
            body: `Test alert for ${eventKey} received successfully.`,
            icon: '/favicon.ico'
          })
        }
      } else {
        alert(`'${eventKey}' notifications are currently toggled OFF in your preferences.`)
      }
      setTimeout(() => setNotifSavedMsg(''), 4000)
    } catch (err) {
      alert('Failed to send test alert.')
    } finally {
      setTestingAlertKey('')
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordError('')
      await api.put('/users/profile/password', {
        currentPassword,
        newPassword,
        confirmPassword
      })
      setPasswordSuccessMsg('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      setTimeout(() => setPasswordSuccessMsg(''), 4000)
    } catch (err) {
      console.error('Failed to update password', err)
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to update password. Check your current password.'
      setPasswordError(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleToggleLoginAlerts = async () => {
    const nextVal = !security.loginAlerts
    const updatedSec = { ...security, loginAlerts: nextVal }
    setSecurity(updatedSec)
    localStorage.setItem('login_alerts', nextVal ? 'true' : 'false')
    setPrefSaving(true)
    try {
      const prefs = buildCleanPreferences()
      prefs.security = updatedSec
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setSecuritySavedMsg('Login alerts preference updated & active!')
      setTimeout(() => setSecuritySavedMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update login alerts', err)
      setSecurity(security)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleChangeSessionTimeout = async (newTimeout) => {
    const updatedSec = { ...security, sessionTimeout: newTimeout }
    setSecurity(updatedSec)
    localStorage.setItem('session_timeout', newTimeout)
    setPrefSaving(true)
    try {
      const prefs = buildCleanPreferences()
      prefs.security = updatedSec
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      window.dispatchEvent(new CustomEvent('preferences-changed', { detail: prefs }))
      setSecuritySavedMsg(`Session timeout set to ${newTimeout}`)
      setTimeout(() => setSecuritySavedMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update session timeout', err)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleToggleAnalytics = async () => {
    const nextVal = !privacy.allowAnalytics
    const updatedPrivacy = { ...privacy, allowAnalytics: nextVal }
    setPrivacy(updatedPrivacy)
    localStorage.setItem('anonymous_analytics', nextVal ? 'true' : 'false')
    setPrefSaving(true)
    try {
      const prefs = buildCleanPreferences()
      prefs.privacy = updatedPrivacy
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setPrivacySavedMsg(nextVal ? 'Anonymous analytics enabled.' : 'Anonymous analytics disabled.')
      setTimeout(() => setPrivacySavedMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update analytics setting', err)
      setPrivacy(privacy)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleExportCompanyData = async () => {
    try {
      setExportingData(true)
      const res = await api.get('/users/export-data')
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(res.data, null, 2)
      )}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute(
        'download',
        `LockStrata_Company_Data_Export_${new Date().toISOString().slice(0, 10)}.json`
      )
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      setPrivacySavedMsg('Company data exported successfully.')
      setTimeout(() => setPrivacySavedMsg(''), 3500)
    } catch (err) {
      console.error('Data export error:', err)
      alert('Failed to export company data: ' + (err.response?.data?.message || err.message))
    } finally {
      setExportingData(false)
    }
  }

  const handleResetToDefault = async () => {
    if (activeTab === 'Notifications') {
      if (!window.confirm('Reset all notification settings to defaults?')) return
      const defaultNotifs = {
        expiration: true,
        assignment: true,
        revocation: true,
        activity: true,
        purchases: true,
        security: true,
        email: true,
        push: true
      }
      const defaultEmail = userProfile.email || 'bulkbuyer@example.com'
      setNotifications(defaultNotifs)
      setEmailAddress(defaultEmail)
      setEmailError('')
      setPrefSaving(true)
      try {
        const prefs = buildCleanPreferences(defaultNotifs, defaultEmail)
        await api.put('/users/profile', {
          fullName: companyProfile.name || 'Bulk Buyer',
          preferences: JSON.stringify(prefs)
        })
        setNotifSavedMsg('Notification settings reset to defaults & persisted!')
        setTimeout(() => setNotifSavedMsg(''), 3500)
      } catch (err) {
        console.error('Failed to reset notification settings', err)
        alert('Failed to reset notification settings.')
      } finally {
        setPrefSaving(false)
      }
    } else if (activeTab === 'Security') {
      if (!window.confirm('Reset security settings to defaults?')) return
      const defaultSecurity = {
        twoFactor: userProfile.twoFactorEnabled,
        loginAlerts: true,
        sessionTimeout: '30 minutes'
      }
      setSecurity(defaultSecurity)
      localStorage.setItem('login_alerts', 'true')
      localStorage.setItem('session_timeout', '30 minutes')
      setPrefSaving(true)
      try {
        const prefs = buildCleanPreferences()
        prefs.security = defaultSecurity
        await api.put('/users/profile', {
          fullName: companyProfile.name || 'Bulk Buyer',
          preferences: JSON.stringify(prefs)
        })
        window.dispatchEvent(new CustomEvent('preferences-changed', { detail: prefs }))
        setSecuritySavedMsg('Security settings reset to defaults & saved!')
        setTimeout(() => setSecuritySavedMsg(''), 3500)
      } catch (err) {
        console.error('Failed to reset security settings', err)
        alert('Failed to reset security settings.')
      } finally {
        setPrefSaving(false)
      }
    } else if (activeTab === 'Privacy & Data') {
      if (!window.confirm('Reset privacy preferences to defaults?')) return
      const defaultPrivacy = {
        allowAnalytics: true
      }
      setPrivacy(defaultPrivacy)
      localStorage.setItem('anonymous_analytics', 'true')
      setPrefSaving(true)
      try {
        const prefs = buildCleanPreferences()
        prefs.privacy = defaultPrivacy
        await api.put('/users/profile', {
          fullName: companyProfile.name || 'Bulk Buyer',
          preferences: JSON.stringify(prefs)
        })
        setPrivacySavedMsg('Privacy preferences reset to defaults & saved!')
        setTimeout(() => setPrivacySavedMsg(''), 3500)
      } catch (err) {
        console.error('Failed to reset privacy settings', err)
        alert('Failed to reset privacy settings.')
      } finally {
        setPrefSaving(false)
      }
    }
  }

  const handleCancel = async () => {
    try {
      setLoading(true)
      const [res, userRes, devRes] = await Promise.all([
        api.get('/bulk-buyer/settings'),
        api.get('/users/profile'),
        api.get('/users/profile/devices').catch(() => ({ data: [] }))
      ])
      setCompanyProfile(res.data)
      setUserProfile({
        email: userRes.data.email,
        twoFactorEnabled: userRes.data.twoFactorEnabled || false
      })
      setKnownDevices(devRes.data || [])
      let userEmail = userRes.data.email || ''
      if (userRes.data.preferences) {
        try {
          const prefs = JSON.parse(userRes.data.preferences)
          if (prefs.theme) setTheme(prefs.theme)
          if (prefs.accentColor) setAccentColor(prefs.accentColor)
          if (prefs.fontSize) setFontSize(prefs.fontSize)
          if (prefs.dashboardPrefs) setDashboardPrefs(prefs.dashboardPrefs)
          if (prefs.notifications) {
            const { sms, ...cleanNotifs } = prefs.notifications
            setNotifications(prev => ({ ...prev, ...cleanNotifs }))
            if (cleanNotifs.emailAddress) userEmail = cleanNotifs.emailAddress
          }
          if (prefs.teamPreferences) setTeamPreferences(prefs.teamPreferences)
          if (prefs.licenseManagement) setLicenseManagement(prefs.licenseManagement)
          if (prefs.security) {
            setSecurity(prev => ({
              ...prev,
              loginAlerts: prefs.security.loginAlerts !== undefined ? prefs.security.loginAlerts : true,
              sessionTimeout: prefs.security.sessionTimeout || '30 minutes'
            }))
          }
          if (prefs.privacy) setPrivacy(prefs.privacy)
        } catch (e) {}
      }
      setEmailAddress(userEmail)
      setEmailError('')
      setIsChangingPassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      setNotifSavedMsg('Unsaved changes discarded.')
      setTimeout(() => setNotifSavedMsg(''), 3000)
    } catch (err) {
      console.error('Failed to reload settings', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (emailAddress && !validateEmail(emailAddress)) {
      setEmailError('Please enter a valid email address.')
      alert('Please enter a valid notification email address.')
      return
    }
    try {
      setLoading(true)
      await api.put('/bulk-buyer/settings', companyProfile)
      const prefs = buildCleanPreferences()
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setNotifSavedMsg('All settings saved successfully!')
      setTimeout(() => setNotifSavedMsg(''), 3500)
      alert('Settings saved successfully!')
    } catch (err) {
      console.error('Failed to save settings', err)
      alert('Failed to save settings: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSavedMsg, setPrefSavedMsg] = useState('')

  const handleToggleTeamPreference = async (key) => {
    const updated = {
      ...teamPreferences,
      [key]: !teamPreferences[key]
    }
    setTeamPreferences(updated)
    setPrefSaving(true)
    try {
      const prefs = {
        theme,
        accentColor,
        fontSize,
        dashboardPrefs,
        notifications,
        teamPreferences: updated,
        licenseManagement
      }
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setPrefSavedMsg('Preference saved & active!')
      setTimeout(() => setPrefSavedMsg(''), 3500)
    } catch (err) {
      console.error('Failed to auto-save preference', err)
    } finally {
      setPrefSaving(false)
    }
  }

  const [expCheckLoading, setExpCheckLoading] = useState(false)
  const [expCheckResult, setExpCheckResult] = useState(null)

  const handleUpdateLicenseManagement = async (key, value) => {
    const updated = {
      ...licenseManagement,
      [key]: value
    }
    setLicenseManagement(updated)
    setPrefSaving(true)
    try {
      const prefs = {
        theme,
        accentColor,
        fontSize,
        dashboardPrefs,
        notifications,
        teamPreferences,
        licenseManagement: updated
      }
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setPrefSavedMsg('License policy updated & active!')
      setTimeout(() => setPrefSavedMsg(''), 3500)
    } catch (err) {
      console.error('Failed to auto-save license preference', err)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleDashboardPrefChange = async (field, value) => {
    const updated = { ...dashboardPrefs, [field]: value }
    setDashboardPrefs(updated)
    setPrefSaving(true)
    try {
      const prefs = {
        theme,
        accentColor,
        fontSize,
        dashboardPrefs: updated,
        notifications,
        teamPreferences,
        licenseManagement
      }
      localStorage.setItem('bulkbuyer_preferences', JSON.stringify(prefs))
      window.dispatchEvent(new CustomEvent('preferences-changed', { detail: prefs }))
      await api.put('/users/profile', {
        fullName: companyProfile.name || 'Bulk Buyer',
        preferences: JSON.stringify(prefs)
      })
      setPrefSavedMsg('Dashboard preferences saved!')
      setTimeout(() => setPrefSavedMsg(''), 3500)
    } catch (err) {
      console.error('Failed to auto-save dashboard preference', err)
    } finally {
      setPrefSaving(false)
    }
  }

  const handleRunExpirationCheck = async () => {
    setExpCheckLoading(true)
    setExpCheckResult(null)
    try {
      const res = await api.post('/bulk-buyer/licenses/check-expirations')
      setExpCheckResult(res.data)
    } catch (err) {
      console.error('Failed to run expiration check', err)
      alert('Failed to run expiration check: ' + (err.response?.data?.message || err.message))
    } finally {
      setExpCheckLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    try {
      setLoading(true)
      await api.post(`/auth/2fa/disable?email=${encodeURIComponent(userProfile.email)}`)
      setUserProfile(prev => ({ ...prev, twoFactorEnabled: false }))
      setSuccessMsg("Two-Factor Authentication has been successfully disabled.")
    } catch (err) {
      console.error("Failed to disable 2FA", err)
      setErrorMsg(err.response?.data?.message || "Failed to disable 2FA.")
    } finally {
      setLoading(false)
    }
  }

  const [teamPreferences, setTeamPreferences] = useState({
    allowInvitations: true,
    requireApproval: false,
    autoRelease: true
  })

  const [licenseManagement, setLicenseManagement] = useState({
    defaultAssignment: 'Employee + Device',
    exp30: true,
    exp14: true,
    exp7: true,
    exp1: true,
    autoRelease: false,
    autoNotify: false
  })


  // Theme effect (copied from Settings.jsx logic)
  useEffect(() => {
    const applyTheme = (isDark) => {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
      window.dispatchEvent(new Event('theme-changed'))
      if (isDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }

    if (theme === 'Dark') applyTheme(true)
    else if (theme === 'Light') applyTheme(false)
    else {
      const match = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(match.matches)
      const listener = (e) => applyTheme(e.matches)
      match.addEventListener('change', listener)
      return () => match.removeEventListener('change', listener)
    }
  }, [theme])

  // Font size effect
  useEffect(() => {
    if (fontSize.includes('16px')) document.documentElement.style.fontSize = '16px'
    else if (fontSize.includes('12px')) document.documentElement.style.fontSize = '12px'
    else document.documentElement.style.fontSize = '14px'
  }, [fontSize])

  // Accent color effect
  useEffect(() => {
    let hex = '#0f52ba' // default blue
    if (accentColor === 'sky') hex = '#0ea5e9'
    if (accentColor === 'orange') hex = '#ea580c'
    if (accentColor === 'slate') hex = '#475569'
    if (accentColor === 'purple') hex = '#8b5cf6'
    if (accentColor === 'green') hex = '#10b981'
    if (accentColor === 'pink') hex = '#ec4899'

    let styleEl = document.getElementById('dynamic-accent')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'dynamic-accent'
      document.head.appendChild(styleEl)
    }
    
    styleEl.innerHTML = `
      .bg-\\[\\#0f52ba\\] { background-color: ${hex} !important; }
      .text-\\[\\#0f52ba\\] { color: ${hex} !important; }
      .border-\\[\\#0f52ba\\] { border-color: ${hex} !important; }
      .ring-\\[\\#0f52ba\\] { --tw-ring-color: ${hex} !important; }
    `
  }, [accentColor])

  const tabs = [
    { id: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'Licensing', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { id: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'Privacy & Data', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
  ]

  const Toggle = ({ checked, onChange }) => (
    <div onClick={onChange} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${checked ? 'bg-[#0f52ba]' : 'bg-slate-300 dark:bg-slate-700'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}></div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'General':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Company Profile */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Company Profile</h3>
              <p className="text-xs text-slate-500 mb-6">Manage your company information.</p>
              
              {/* Profile Picture Upload */}
              <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m14-10a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <button className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full text-white transition-all cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </button>
                </div>
                <div>
                  <div className="flex space-x-3 mb-2">
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
                      Upload New Photo
                    </button>
                    <button className="px-4 py-2 bg-transparent text-xs font-bold text-slate-500 hover:text-red-500 transition-colors cursor-pointer">
                      Remove
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">JPG, GIF or PNG. Max size of 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-y-4 text-xs items-center">
                <div className="font-bold text-slate-500">Company Name</div>
                <input 
                  type="text" 
                  value={companyProfile.name || ''} 
                  onChange={(e) => setCompanyProfile({...companyProfile, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-900 dark:text-white"
                />
                
                <div className="font-bold text-slate-500">Company Email</div>
                <input 
                  type="email" 
                  value={companyProfile.email || ''} 
                  onChange={(e) => setCompanyProfile({...companyProfile, email: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-900 dark:text-white"
                />
                
                <div className="font-bold text-slate-500">Phone</div>
                <input 
                  type="text" 
                  value={companyProfile.phone || ''} 
                  onChange={(e) => setCompanyProfile({...companyProfile, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">API Webhooks</h3>
                <p className="text-[10px] text-slate-500 mb-4">Set a webhook URL to receive real-time POST events when licenses are activated or revoked.</p>
                <div className="grid grid-cols-[120px_1fr] gap-y-4 text-xs items-center">
                  <div className="font-bold text-slate-500">Webhook URL</div>
                  <input 
                    type="url" 
                    placeholder="https://your-server.com/webhook"
                    value={companyProfile.webhookUrl || ''} 
                    onChange={(e) => setCompanyProfile({...companyProfile, webhookUrl: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Appearance</h3>
              <p className="text-xs text-slate-500 mb-6">Customize the look and feel of your portal.</p>
              
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Theme Mode</p>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setTheme('Light')} className={`p-4 rounded-lg border ${theme === 'Light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                    <svg className={`w-6 h-6 mb-2 ${theme === 'Light' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Light</span>
                  </button>
                  <button onClick={() => setTheme('Dark')} className={`p-4 rounded-lg border ${theme === 'Dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                    <svg className={`w-6 h-6 mb-2 ${theme === 'Dark' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dark</span>
                  </button>
                  <button onClick={() => setTheme('System')} className={`p-4 rounded-lg border ${theme === 'System' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                    <svg className={`w-6 h-6 mb-2 ${theme === 'System' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">System</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Accent Color</p>
                  <div className="flex space-x-2 mt-2">
                    {['blue', 'sky', 'orange', 'slate'].map(color => {
                      let bg = ''
                      if (color === 'blue') bg = 'bg-[#0f52ba]'
                      if (color === 'sky') bg = 'bg-sky-500'
                      if (color === 'orange') bg = 'bg-orange-600'
                      if (color === 'slate') bg = 'bg-slate-600'
                      
                      return (
                        <button 
                          key={color} 
                          onClick={() => {
                            setAccentColor(color);
                            applyAccentColor(color);
                          }} 
                          className={`w-8 h-8 rounded-full swatch-circle cursor-pointer ${bg} ${accentColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''} border border-transparent hover:scale-110 transition-transform`}
                        ></button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Font Size</p>
                  <select 
                    value={fontSize} 
                    onChange={(e) => setFontSize(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Standard (Inter 14px)</option>
                    <option>Large (Inter 16px)</option>
                    <option>Compact (Inter 12px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dashboard Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Dashboard Preferences</h3>
                  <p className="text-xs text-slate-500">Customize how you interact with the dashboard.</p>
                </div>
              </div>
              
              <div className="space-y-6 max-w-md mt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">Default Landing Page</label>
                  <select 
                    value={dashboardPrefs.landingPage} 
                    onChange={e => handleDashboardPrefChange('landingPage', e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Dashboard">Dashboard</option>
                    <option value="Employees">Employees</option>
                    <option value="Licenses">Licenses</option>
                    <option value="Orders & Purchases">Orders & Purchases</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">The page you see when you first log in.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">Table Data Density</label>
                  <select 
                    value={dashboardPrefs.dataDensity} 
                    onChange={e => handleDashboardPrefChange('dataDensity', e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Comfortable (Default)">Comfortable (Default)</option>
                    <option value="Compact (More rows)">Compact (More rows)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Adjust row spacing in data tables.</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Enable Quick Actions Menus</p>
                    <p className="text-[10px] text-slate-500 mt-1">Show hover actions on data rows</p>
                  </div>
                  <Toggle 
                    checked={dashboardPrefs.showQuickActions} 
                    onChange={() => handleDashboardPrefChange('showQuickActions', !dashboardPrefs.showQuickActions)} 
                  />
                </div>
              </div>
            </div>

            {/* Team Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Team Preferences</h3>
                  <p className="text-xs text-slate-500">Set and enforce automated policies for managing your company team.</p>
                </div>
                {prefSaving && (
                  <span className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                    <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Saving policy...
                  </span>
                )}
                {prefSavedMsg && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    ✓ {prefSavedMsg}
                  </span>
                )}
              </div>

              <div className="space-y-6 mt-6 divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* 1. Allow Employee Invitations */}
                <div className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Allow Employee Invitations</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        teamPreferences.allowInvitations 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {teamPreferences.allowInvitations ? 'Invitation Emails Active' : 'Emails Paused'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Allow sending invitation emails to employees. When active, credentials and activation links are emailed directly upon staff creation.
                    </p>
                  </div>
                  <Toggle checked={teamPreferences.allowInvitations} onChange={() => handleToggleTeamPreference('allowInvitations')} />
                </div>
                
                {/* 2. Require Approval for License Assignment */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Require Approval for License Assignment</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        teamPreferences.requireApproval 
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {teamPreferences.requireApproval ? 'Requires Manager Approval' : 'Instant Assignment'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Managers must approve license assignments. When active, new assignments enter Pending Approval status and seats are reserved upon manager approval.
                    </p>
                  </div>
                  <Toggle checked={teamPreferences.requireApproval} onChange={() => handleToggleTeamPreference('requireApproval')} />
                </div>

                {/* 3. Automatically Release Licenses */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Automatically Release Licenses</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        teamPreferences.autoRelease 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {teamPreferences.autoRelease ? 'Auto-Return to Pool Enabled' : 'Manual Revocation Only'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Release licenses when employees are removed. When enabled, removing an employee unlinks all assigned seats and restores license pool capacity immediately.
                    </p>
                  </div>
                  <Toggle checked={teamPreferences.autoRelease} onChange={() => handleToggleTeamPreference('autoRelease')} />
                </div>
              </div>
            </div>
          </div>
        )
        
      case 'Licensing':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white">License Management</h3>
                <div className="flex items-center space-x-2">
                  {prefSavedMsg && (
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                      ✓ {prefSavedMsg}
                    </span>
                  )}
                  {prefSaving && (
                    <span className="inline-flex items-center text-xs text-slate-400">
                      <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-[#0f52ba]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Saving policy...
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-6">Configure how your company manages licenses.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Default Assignment */}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Default Assignment</p>
                  <div className="space-y-3">
                    {['Employee', 'Device', 'Employee + Device'].map(option => (
                      <label key={option} className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="assignment" 
                          checked={licenseManagement.defaultAssignment === option} 
                          onChange={() => handleUpdateLicenseManagement('defaultAssignment', option)} 
                          className="w-4 h-4 text-[#0f52ba] focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                        />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Expiration Alerts */}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Expiration Alerts</p>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={licenseManagement.exp30} 
                        onChange={() => handleUpdateLicenseManagement('exp30', !licenseManagement.exp30)} 
                        className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">30 days before expiration</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={licenseManagement.exp14} 
                        onChange={() => handleUpdateLicenseManagement('exp14', !licenseManagement.exp14)} 
                        className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">14 days before expiration</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={licenseManagement.exp7} 
                        onChange={() => handleUpdateLicenseManagement('exp7', !licenseManagement.exp7)} 
                        className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">7 days before expiration</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={licenseManagement.exp1} 
                        onChange={() => handleUpdateLicenseManagement('exp1', !licenseManagement.exp1)} 
                        className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">1 day before expiration</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Automatic Actions</p>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={licenseManagement.autoRelease} 
                      onChange={() => handleUpdateLicenseManagement('autoRelease', !licenseManagement.autoRelease)} 
                      className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Automatically release expired licenses</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={licenseManagement.autoNotify} 
                      onChange={() => handleUpdateLicenseManagement('autoNotify', !licenseManagement.autoNotify)} 
                      className="w-4 h-4 text-[#0f52ba] rounded focus:ring-[#0f52ba] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Automatically notify employee before expiration</span>
                  </label>
                </div>
              </div>

              {/* Run Expiration Check Now */}
              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Run Expiration & Maintenance Check</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manually trigger the expiration scheduler to evaluate active licenses against your configured policy.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRunExpirationCheck}
                  disabled={expCheckLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  {expCheckLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 mr-1.5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  )}
                  {expCheckLoading ? 'Evaluating...' : 'Run Expiration Check Now'}
                </button>
              </div>

              {expCheckResult && (
                <div className="mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-900 dark:text-blue-300 animate-in fade-in">
                  <p className="font-bold flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Expiration Policy Evaluation Complete
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Checked {expCheckResult.checkedLicenses} license(s). Released {expCheckResult.autoReleasedLicenses} expired license(s) ({expCheckResult.autoReleasedAssignments} assignment seats). Sent {expCheckResult.buyerAlertsSent} buyer alert(s) and {expCheckResult.employeeAlertsSent} employee alert(s).
                  </p>
                </div>
              )}
            </div>
          </div>
        )
        
      case 'Notifications':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {notifSavedMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
                <span className="flex items-center font-medium">
                  <svg className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  {notifSavedMsg}
                </span>
              </div>
            )}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                <button
                  onClick={() => handleSendTestAlert('expiration')}
                  disabled={testingAlertKey !== ''}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0f52ba] dark:text-blue-400 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center cursor-pointer disabled:opacity-50"
                  title="Send a verified test notification to test your current preferences"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                  {testingAlertKey ? 'Testing...' : 'Send Test Alert'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-6">Choose what you want to be notified about.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  {[
                    { id: 'expiration', title: 'License Expiration Alerts', desc: 'Get notified about expiring licenses', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'assignment', title: 'License Assignment', desc: 'Get notified when licenses are assigned', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'revocation', title: 'License Revocation', desc: 'Get notified when licenses are revoked', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'activity', title: 'Employee Activity', desc: 'Important employee and license activity', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { id: 'purchases', title: 'Purchase Notifications', desc: 'Successful purchases and invoices', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                    { id: 'security', title: 'Security Alerts', desc: 'Important security and login alerts', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle checked={notifications[item.id] !== false} onChange={() => handleToggleNotification(item.id)} />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-4">Notification Method</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</span>
                      </div>
                      <Toggle checked={notifications.email !== false} onChange={() => handleToggleNotification('email')} />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Browser Push</span>
                      </div>
                      <Toggle checked={notifications.push === true} onChange={handleToggleBrowserPush} />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Email Address</p>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={e => { setEmailAddress(e.target.value); setEmailError('') }}
                    onBlur={handleSaveEmailAddress}
                    placeholder="name@company.com"
                    className={`w-full border ${emailError ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-[#0f52ba]'} bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2`}
                  />
                  {emailError ? (
                    <p className="text-[10px] text-red-500 mt-1.5 font-medium">{emailError}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-2">This is where notifications will be sent.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 'Security':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Security</h3>
                {securitySavedMsg && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
                    ✓ {securitySavedMsg}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-6">Secure your company account.</p>

              <div className="space-y-6 max-w-lg">
                {/* Password Row / Inline Form */}
                {!isChangingPassword ? (
                  <div className="grid grid-cols-[150px_1fr_auto] gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</div>
                    <div className="text-xs text-slate-500">
                      {passwordSuccessMsg && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {passwordSuccessMsg}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setIsChangingPassword(true)
                        setPasswordError('')
                        setPasswordSuccessMsg('')
                      }}
                      className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Change Password</div>
                      <button 
                        onClick={() => {
                          setIsChangingPassword(false)
                          setCurrentPassword('')
                          setNewPassword('')
                          setConfirmPassword('')
                          setPasswordError('')
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    {passwordError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                        {passwordError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Current Password
                        </label>
                        <input 
                          type="password"
                          value={currentPassword}
                          onChange={e => { setCurrentPassword(e.target.value); setPasswordError('') }}
                          placeholder="Enter current password"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          New Password
                        </label>
                        <input 
                          type="password"
                          value={newPassword}
                          onChange={e => { setNewPassword(e.target.value); setPasswordError('') }}
                          placeholder="Enter new password (min. 8 chars, uppercase, lowercase, number, special char)"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Confirm New Password
                        </label>
                        <input 
                          type="password"
                          value={confirmPassword}
                          onChange={e => { setConfirmPassword(e.target.value); setPasswordError('') }}
                          placeholder="Confirm new password"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <button 
                          onClick={handleUpdatePassword}
                          disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                          className="px-4 py-1.5 bg-[#0f52ba] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center cursor-pointer"
                        >
                          {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsChangingPassword(false)
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmPassword('')
                            setPasswordError('')
                          }}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 2FA */}
                <div className="grid grid-cols-[150px_1fr_auto] gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center justify-between col-span-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-[10px] text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                      {userProfile.twoFactorEnabled && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Enabled</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      {userProfile.twoFactorEnabled ? (
                        <>
                          <button 
                            onClick={handleDisable2FA}
                            className="text-xs font-bold text-red-600 dark:text-red-400 border border-red-500 rounded px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            Disable 2FA
                          </button>
                          <button 
                            onClick={() => setIs2FAModalOpen(true)}
                            className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                          >
                            Reset 2FA
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setIs2FAModalOpen(true)}
                          className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="grid grid-cols-[150px_1fr_auto] gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Active Sessions</div>
                  <div className="text-xs text-emerald-500 font-medium">
                    {knownDevices.length > 0 ? `${knownDevices.length} active session${knownDevices.length === 1 ? '' : 's'}` : '1 active session'}
                  </div>
                  <button 
                    onClick={() => setIsSessionsModalOpen(true)}
                    className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  >
                    Manage Sessions
                  </button>
                </div>

                {/* Login Alerts */}
                <div className="grid grid-cols-[150px_1fr_auto] gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Login Alerts</div>
                  <div className="text-xs text-emerald-500 font-medium">{security.loginAlerts !== false ? 'Enabled' : 'Disabled'}</div>
                  <div className="flex justify-end">
                    <Toggle checked={security.loginAlerts !== false} onChange={handleToggleLoginAlerts} />
                  </div>
                </div>

                {/* Session Timeout */}
                <div className="grid grid-cols-[150px_1fr_auto] gap-4 items-center">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Session Timeout</div>
                  <div className="col-span-2">
                    <select 
                      value={security.sessionTimeout || '30 minutes'} 
                      onChange={e => handleChangeSessionTimeout(e.target.value)} 
                      className="w-full md:w-64 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#0f52ba]"
                    >
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 'Privacy & Data':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Privacy & Data</h3>
                {privacySavedMsg && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
                    ✓ {privacySavedMsg}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-6">Manage your data and privacy preferences.</p>

              <div className="space-y-8 max-w-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Allow Anonymous Analytics</p>
                    <p className="text-[10px] text-slate-500 mt-1">Help improve LockStrata with anonymous data</p>
                  </div>
                  <Toggle checked={privacy.allowAnalytics !== false} onChange={handleToggleAnalytics} />
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Data Export</p>
                    <p className="text-[10px] text-slate-500 mt-1">Export your company data</p>
                  </div>
                  <button 
                    onClick={handleExportCompanyData}
                    disabled={exportingData}
                    className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-4 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 flex items-center cursor-pointer"
                  >
                    {exportingData ? 'Exporting...' : 'Request Export'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Delete Company Account</p>
                    <p className="text-[10px] text-slate-500 mt-1">Permanently delete your company account</p>
                  </div>
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="text-xs font-bold text-red-600 border border-red-600 rounded px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                  >
                    Request Deletion
                  </button>
                </div>
              </div>
            </div>
            
            {/* Support Box */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Support & Help</h3>
              <p className="text-xs text-slate-500 mb-4">Need help? We're here for you.</p>
              <div className="space-y-1">
                {[
                  { title: 'Documentation', desc: 'View guides and documentation', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', onClick: () => setIsDocModalOpen(true) },
                  { title: 'Contact Support', desc: 'Get help from our support team', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', onClick: () => setIsSupportModalOpen(true) },
                  { title: 'System Status', desc: 'Check LockStrata system status', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', onClick: () => setIsStatusModalOpen(true) },
                  { title: 'FAQ', desc: 'Frequently asked questions', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', onClick: () => setIsFaqModalOpen(true) },
                ].map(link => (
                  <button 
                    key={link.title} 
                    onClick={link.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-[#0f52ba] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon}></path></svg>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{link.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{link.desc}</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-slate-950 font-sans text-slate-900 dark:text-white animate-in fade-in duration-500">
      
      {/* INNER SIDEBAR (Left Column) */}
      <div className={`${isMobileMenuOpen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 flex' : 'hidden'} md:flex md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col transition-colors`}>
        
        {/* Header/Close for mobile */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 md:hidden">
          <h2 className="font-bold text-lg text-[#0f52ba]">Settings</h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Sidebar Header */}
        <div className="p-6 hidden md:block">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Settings</h2>
          <p className="text-xs text-slate-500">Manage your company account and preferences.</p>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false) }} 
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-blue-50 text-[#0f52ba] dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <svg className={`w-5 h-5 ${activeTab === tab.id ? 'text-[#0f52ba]' : 'text-slate-400 group-hover:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}></path></svg>
              <span>{tab.id}</span>
            </button>
          ))}
        </nav>

        {/* Return to Dashboard */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center space-x-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors">
        
        {/* Mobile Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 rounded hover:bg-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">{activeTab}</h1>
          </div>
          <div className="w-8 h-8 rounded bg-[#0f52ba] text-white flex items-center justify-center font-bold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
        </header>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 lg:p-12 max-w-5xl mx-auto min-h-full flex flex-col">
            
            {/* Tab Header (Desktop only) */}
            <div className="hidden md:block mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-[#0f52ba]">{activeTab}</h2>
            </div>
            
            {/* Main Render Area */}
            <div className="flex-1">
              {renderContent()}
            </div>

            {/* Bottom Actions */}
            <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between items-center sm:space-x-4">
              <button 
                onClick={handleResetToDefault}
                disabled={prefSaving || loading}
                className="w-full sm:w-auto mt-4 sm:mt-0 px-6 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Reset to Default
              </button>
              <div className="flex w-full sm:w-auto space-x-3">
                <button 
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSettings} 
                  disabled={loading} 
                  className="flex-1 sm:flex-none px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors flex items-center justify-center shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                  {loading ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <TwoFactorSetupModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        userEmail={userProfile.email} 
        onSuccess={() => {
          setSuccessMsg('2FA has been successfully enabled')
          setUserProfile({...userProfile, twoFactorEnabled: true})
        }} 
      />

      <ManageSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        devices={knownDevices}
        onRefreshDevices={refreshDevices}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        isCompany={true}
      />

      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      <ContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onTicketCreated={(ticket) => {
          setPrivacySavedMsg(`Support ticket #${ticket.id} submitted successfully!`)
          setTimeout(() => setPrivacySavedMsg(''), 4000)
        }}
      />

      <SystemStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      <FAQModal
        isOpen={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
      />
    </div>
  )
}

export default BulkBuyerSettings
