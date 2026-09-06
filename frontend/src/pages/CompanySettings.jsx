import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import TwoFactorSetupModal from '../components/TwoFactorSetupModal'
import DeleteAccountModal from '../components/DeleteAccountModal'
import { applyAccentColor } from '../utils/accentColor'

export default function CompanySettings({ userName, userRole, theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab === 'Profile' ? 'general' : (location.state?.activeTab || 'general'))

  // UI Local State
  const [general, setGeneral] = useState({ language: 'English', timeZone: 'UTC', dateFormat: 'MM/DD/YYYY', timeFormat: '12-hour', startOfWeek: 'Monday', itemsPerPage: '25', enableTips: true, compactMode: false })
  const [companyProfile, setCompanyProfile] = useState({ companyName: userName || '', email: '', phone: '', description: '', twoFactorEnabled: false })
  const [productPrefs, setProductPrefs] = useState({ defaultVisibility: 'Public', defaultStatus: 'Draft' })
  const [licensing, setLicensing] = useState({ defaultType: 'Subscription', defaultDuration: '1 Year', defaultLimit: '1', expirationRules: 'Strict (Instant Deactivation)', renewalPrefs: 'Manual', autoGenerate: false })
  const [notifications, setNotifications] = useState({ expiration: true, activation: true, revocation: true, buyerActivity: false, email: true, browser: true })
  const [privacy, setPrivacy] = useState({ allowAnalytics: true, publicDirectory: false })
  const [exportingData, setExportingData] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Vendor Webhook State
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState({ type: '', text: '' })
  const [webhookTestResult, setWebhookTestResult] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const localLic = localStorage.getItem('company_licensing_prefs')
        if (localLic) {
          try {
            setLicensing(prev => ({ ...prev, ...JSON.parse(localLic) }))
          } catch (e) {}
        }
        const localNotif = localStorage.getItem('company_notification_prefs')
        if (localNotif) {
          try {
            setNotifications(prev => ({ ...prev, ...JSON.parse(localNotif) }))
          } catch (e) {}
        }
        const localPrivacy = localStorage.getItem('company_privacy_prefs')
        if (localPrivacy) {
          try {
            setPrivacy(prev => ({ ...prev, ...JSON.parse(localPrivacy) }))
          } catch (e) {}
        }
        const res = await api.get('/users/profile')
        let prefs = {}
        if (res.data.preferences) {
          try {
            prefs = JSON.parse(res.data.preferences)
            if (prefs.theme) setTheme(prefs.theme)
            if (prefs.accentColor) {
              setAccentColor(prefs.accentColor)
              applyAccentColor(prefs.accentColor)
            }
            if (prefs.general) setGeneral(prefs.general)
            if (prefs.productPrefs) setProductPrefs(prefs.productPrefs)
            if (prefs.licensing) {
              setLicensing(prev => ({ ...prev, ...prefs.licensing }))
              localStorage.setItem('company_licensing_prefs', JSON.stringify(prefs.licensing))
            }
            if (prefs.notifications) {
              setNotifications(prev => ({ ...prev, ...prefs.notifications }))
              localStorage.setItem('company_notification_prefs', JSON.stringify(prefs.notifications))
            }
            if (prefs.privacy) {
              setPrivacy(prev => ({ ...prev, ...prefs.privacy }))
              localStorage.setItem('company_privacy_prefs', JSON.stringify(prefs.privacy))
            }
          } catch (e) {
            console.error('Failed to parse preferences', e)
          }
        }
        setCompanyProfile({
          companyName: res.data.fullName || userName || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          description: prefs.companyDescription || prefs.description || '',
          companyIdStr: res.data.companyId ? `ORG-${String(res.data.companyId).padStart(4, '0')}` : 'ORG-9482-11X',
          twoFactorEnabled: res.data.twoFactorEnabled || false,
          rawPreferences: prefs
        })

        try {
          const compRes = await api.get('/companies/my-company')
          if (compRes.data && compRes.data.webhookUrl) {
            setWebhookUrl(compRes.data.webhookUrl)
          }
        } catch (compErr) {
          console.warn('Could not fetch company webhook', compErr)
        }
      } catch (err) {
        console.error('Failed to fetch profile', err)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveWebhook = async () => {
    setSavingWebhook(true)
    setWebhookMsg({ type: '', text: '' })
    try {
      await api.put('/companies/my-company/webhook', { webhookUrl: webhookUrl.trim() })
      setWebhookMsg({ type: 'success', text: 'Vendor webhook URL saved successfully.' })
      setTimeout(() => setWebhookMsg({ type: '', text: '' }), 4000)
    } catch (err) {
      setWebhookMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save webhook URL.' })
      setTimeout(() => setWebhookMsg({ type: '', text: '' }), 4000)
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleTestVendorWebhook = async () => {
    if (!webhookUrl || !webhookUrl.trim()) {
      setWebhookTestResult({ success: false, message: 'Please enter a valid Webhook URL first.' })
      setTimeout(() => setWebhookTestResult(null), 5000)
      return
    }
    setTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const res = await api.post('/companies/my-company/webhook/test', { webhookUrl: webhookUrl.trim() })
      setWebhookTestResult(res.data)
      setTimeout(() => setWebhookTestResult(null), 7000)
    } catch (err) {
      setWebhookTestResult({
        success: false,
        message: err.response?.data?.message || 'Failed to send webhook verification.'
      })
      setTimeout(() => setWebhookTestResult(null), 7000)
    } finally {
      setTestingWebhook(false)
    }
  }
  
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('')
        setErrorMsg('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg, errorMsg])
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleDisable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    try {
      await api.post(`/auth/2fa/disable?email=${encodeURIComponent(companyProfile.email)}`)
      setCompanyProfile(prev => ({ ...prev, twoFactorEnabled: false }))
      setSuccessMsg("Two-Factor Authentication has been successfully disabled.")
    } catch (err) {
      console.error("Failed to disable 2FA", err)
      setErrorMsg(err.response?.data?.message || "Failed to disable 2FA.")
    }
  }

  const handleSaveProfile = async () => {
    try {
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        description: companyProfile.description,
        accentColor,
        theme,
        fontSize
      }
      await api.put('/users/profile', {
        fullName: companyProfile.companyName,
        phone: companyProfile.phone,
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({
        ...prev,
        rawPreferences: currentPrefs
      }))
      setSuccessMsg('Company profile and description updated successfully.')
    } catch (e) {
      console.error('Failed to update profile', e)
      setErrorMsg('Failed to update profile.')
    }
  }

  const handleSaveAppearance = async () => {
    try {
      applyAccentColor(accentColor)
      localStorage.setItem('theme', theme.toLowerCase())
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        accentColor,
        theme,
        fontSize
      }
      await api.put('/users/profile', {
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({
        ...prev,
        rawPreferences: currentPrefs
      }))
      setSuccessMsg('Appearance preferences saved successfully.')
    } catch (e) {
      console.error('Failed to save appearance', e)
      setErrorMsg('Failed to save appearance settings.')
    }
  }

  const handleSaveProductPrefs = async () => {
    try {
      localStorage.setItem('company_product_prefs', JSON.stringify(productPrefs))
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        productPrefs
      }
      await api.put('/users/profile', {
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({
        ...prev,
        rawPreferences: currentPrefs
      }))
      setSuccessMsg('Product preferences saved successfully.')
    } catch (e) {
      console.error('Failed to save product preferences', e)
      setErrorMsg('Failed to save product preferences.')
    }
  }

  const handleSaveLicensing = async () => {
    try {
      localStorage.setItem('company_licensing_prefs', JSON.stringify(licensing))
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        licensing
      }
      await api.put('/users/profile', {
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({
        ...prev,
        rawPreferences: currentPrefs
      }))
      setSuccessMsg('Licensing settings saved successfully.')
    } catch (e) {
      console.error('Failed to save licensing settings', e)
      setErrorMsg('Failed to save licensing settings.')
    }
  }

  const [testingAlert, setTestingAlert] = useState(false)

  const handleToggleBrowserNotifications = async () => {
    if (!notifications.browser) {
      if (!('Notification' in window)) {
        setErrorMsg('Desktop push notifications are not supported by this browser.')
        return
      }
      let perm = Notification.permission
      if (perm !== 'granted') {
        perm = await Notification.requestPermission()
      }
      if (perm === 'granted') {
        const updated = { ...notifications, browser: true }
        setNotifications(updated)
        localStorage.setItem('company_notification_prefs', JSON.stringify(updated))
        try {
          new Notification("LockStrata Push Notifications Enabled", {
            body: "Real-time desktop alerts for license activations, expirations, and buyer events are now enabled.",
            icon: "/favicon.ico"
          })
        } catch (e) {}
        setSuccessMsg("Browser notifications enabled and verified!")
      } else {
        setErrorMsg("Browser notification permission was not granted. Please allow notifications in your browser address bar.")
      }
    } else {
      const updated = { ...notifications, browser: false }
      setNotifications(updated)
      localStorage.setItem('company_notification_prefs', JSON.stringify(updated))
      setSuccessMsg("Browser notifications disabled.")
    }
  }

  const handleSendTestAlert = async (eventKey = 'activation') => {
    setTestingAlert(true)
    try {
      const res = await api.post(`/notifications/test?eventKey=${eventKey}`)
      if (res.data.success) {
        setSuccessMsg(`Test alert for '${eventKey}' sent! Check notification bell and browser alerts.`)
        if (notifications.browser && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`LockStrata Alert: ${eventKey.toUpperCase()}`, {
            body: `Test alert for ${eventKey} received. Delivery channel is operating normally.`,
            icon: '/favicon.ico'
          })
        }
      } else {
        setErrorMsg(`'${eventKey}' notifications are currently toggled OFF in your preferences.`)
      }
    } catch (e) {
      setErrorMsg("Failed to send test alert.")
    } finally {
      setTestingAlert(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      localStorage.setItem('company_notification_prefs', JSON.stringify(notifications))
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        notifications
      }
      await api.put('/users/profile', {
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({
        ...prev,
        rawPreferences: currentPrefs
      }))
      setSuccessMsg('Notification preferences saved successfully.')
    } catch (e) {
      console.error('Failed to save notification preferences', e)
      setErrorMsg('Failed to save notification preferences.')
    }
  }

  const handleTogglePrivacy = async (key) => {
    const updated = { ...privacy, [key]: !privacy[key] }
    setPrivacy(updated)
    localStorage.setItem('company_privacy_prefs', JSON.stringify(updated))
    try {
      const currentPrefs = {
        ...(companyProfile.rawPreferences || {}),
        companyDescription: companyProfile.description,
        privacy: updated
      }
      await api.put('/users/profile', {
        fullName: companyProfile.companyName,
        phone: companyProfile.phone,
        preferences: JSON.stringify(currentPrefs)
      })
      setCompanyProfile(prev => ({ ...prev, rawPreferences: currentPrefs }))
      setSuccessMsg(
        key === 'allowAnalytics'
          ? (updated.allowAnalytics ? 'Analytics tracking enabled.' : 'Analytics tracking disabled.')
          : (updated.publicDirectory ? 'Public vendor directory enabled.' : 'Public vendor directory disabled.')
      )
    } catch (err) {
      console.error('Failed to sync privacy preferences', err)
      setErrorMsg('Failed to sync privacy preferences.')
    }
  }

  const handleDownloadData = async () => {
    try {
      setExportingData(true)
      const res = await api.get('/users/export-data')
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(res.data, null, 2)
      )}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `LockStrata_Company_Data_Export_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      setSuccessMsg('Company data archive downloaded successfully.')
    } catch (err) {
      console.error('Data export error:', err)
      setErrorMsg('Failed to export company data.')
    } finally {
      setExportingData(false)
    }
  }

  const navItems = [
    { id: 'general', label: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'productPrefs', label: 'Product Preferences', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'licensing', label: 'Licensing', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'webhooks', label: 'API Webhooks', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'appearance', label: 'Appearance', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'privacy', label: 'Privacy & Data', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ]

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white animate-in fade-in duration-500 overflow-hidden">
      
      {/* 1. FAR LEFT: COMPANY SIDEBAR (Exactly matching Dashboard.jsx) */}
      <aside className="w-64 bg-[#111827] flex flex-col transition-colors duration-300 flex-shrink-0 hidden lg:flex border-r border-slate-800 z-30">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0v4"></path></svg>
            LockStrata
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold ml-8">Vendor Portal</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto space-y-6 mt-2 pb-4 scrollbar-hide">
          {/* MAIN */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Main</p>
            <div className="space-y-1">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                <span className="text-sm">Dashboard</span>
              </button>
            </div>
          </div>
          
          {/* PRODUCTS */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Products</p>
            <div className="space-y-1">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                <span className="text-sm">Manage Products</span>
              </button>
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                <span className="text-sm">Product Groups</span>
              </button>
            </div>
          </div>

          {/* LICENSING */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Licensing</p>
            <div className="space-y-1">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                <span className="text-sm">All Licenses</span>
              </button>
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span className="text-sm">Issue New License</span>
              </button>
            </div>
          </div>
        </nav>
        
        {/* Bottom Actions */}
        <div className="h-px bg-slate-800/50 my-2 mx-4"></div>
        <div className="px-4 pb-4 mt-auto space-y-4">
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold transition-all duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="text-sm">Settings</span>
          </button>
          <div className="group relative w-full">
            <button onClick={() => setActiveTab('general')} className="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 hover:border-slate-600 transition-colors">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
                  {userName ? userName.substring(0, 2).toUpperCase() : 'CO'}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-indigo-300 font-medium truncate uppercase tracking-wide">Product Owner</p>
                </div>
              </div>
            </button>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors font-medium text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MIDDLE LEFT: SETTINGS NAVIGATION */}
      <div className="w-full md:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 absolute md:relative z-20 transition-transform hidden md:flex">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                {item.id === 'general' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>}
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 3. RIGHT: MAIN SETTINGS CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        
        {/* TOP BAR */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="text-sm font-medium">Account Settings</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-6">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {userName ? userName.substring(0, 2).toUpperCase() : 'CO'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          
          {/* Settings Header */}
          <div className="max-w-4xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your company account and preferences</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
                      {companyProfile.companyName ? companyProfile.companyName.substring(0,2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Change Logo</button>
                      <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Company Name</label>
                      <input type="text" value={companyProfile.companyName} onChange={e => setCompanyProfile({...companyProfile, companyName: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Company ID</label>
                      <input type="text" disabled value={companyProfile.companyIdStr || "ORG-9482-11X"} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Company Email</label>
                      <input type="email" placeholder="admin@company.com" value={companyProfile.email} onChange={e => setCompanyProfile({...companyProfile, email: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Phone</label>
                      <input type="tel" placeholder="+1 (555) 000-0000" value={companyProfile.phone} onChange={e => setCompanyProfile({...companyProfile, phone: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Company Description</label>
                      <textarea rows="3" placeholder="Brief description of your company..." value={companyProfile.description} onChange={e => setCompanyProfile({...companyProfile, description: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                      <p className="text-xs text-slate-500 mt-1">This will be visible on your public vendor profile if enabled.</p>
                    </div>
                    <div className="col-span-1 md:col-span-2 pt-2 flex justify-end">
                      <button onClick={handleSaveProfile} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors">
                        Save Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'productPrefs' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-6">
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Default Product Visibility</label>
                    <p className="text-xs text-slate-500 mb-3">Determines who can see new products when they are created.</p>
                    <select value={productPrefs.defaultVisibility} onChange={e => setProductPrefs({...productPrefs, defaultVisibility: e.target.value})} className="w-full md:w-1/2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Public (Visible to all users)</option>
                      <option>Private (Internal only)</option>
                      <option>Restricted (Specific Buyers)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Default Product Status</label>
                    <p className="text-xs text-slate-500 mb-3">Initial status for newly created software products.</p>
                    <select value={productPrefs.defaultStatus} onChange={e => setProductPrefs({...productPrefs, defaultStatus: e.target.value})} className="w-full md:w-1/2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Draft</option>
                      <option>Active</option>
                      <option>Beta</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-start space-x-3 border border-blue-100 dark:border-blue-900/50">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Frontend Preferences Only</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">These settings are applied in the UI as defaults when filling out forms. The backend will still validate product creation based on standard rules.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button onClick={handleSaveProductPrefs} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md shadow-indigo-600/20">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'licensing' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Default License Type</label>
                      <p className="text-xs text-slate-500 mb-3">Pre-selected type when issuing.</p>
                      <select value={licensing.defaultType} onChange={e => setLicensing({...licensing, defaultType: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Subscription">Subscription</option>
                        <option value="Volume">Volume (Multi-Seat Enterprise)</option>
                        <option value="Per Device">Per Device (Node-Locked)</option>
                        <option value="Per User">Per User (Named User)</option>
                        <option value="Open Source">Open Source (Community)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Default Duration</label>
                      <p className="text-xs text-slate-500 mb-3">For subscription licenses.</p>
                      <select value={licensing.defaultDuration} onChange={e => setLicensing({...licensing, defaultDuration: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option>1 Month</option>
                        <option>1 Year</option>
                        <option>Lifetime</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">License Expiration Rules</label>
                      <p className="text-xs text-slate-500 mb-3">How expiration is handled globally.</p>
                      <select value={licensing.expirationRules} onChange={e => setLicensing({...licensing, expirationRules: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Strict (Instant Deactivation)">Strict (Instant Deactivation)</option>
                        <option value="Grace Period (7 Days)">Grace Period (7 Days)</option>
                        <option value="Grace Period (30 Days)">Grace Period (30 Days)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Renewal Preferences</label>
                      <p className="text-xs text-slate-500 mb-3">Default setting for customer renewals.</p>
                      <select value={licensing.renewalPrefs} onChange={e => setLicensing({...licensing, renewalPrefs: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Manual">Manual</option>
                        <option value="Auto-Renew">Auto-Renew</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white">Auto-generate offline keys</label>
                        <p className="text-xs text-slate-500">Generate fallback keys for offline environments.</p>
                      </div>
                      <div onClick={() => setLicensing({...licensing, autoGenerate: !licensing.autoGenerate})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${licensing.autoGenerate ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${licensing.autoGenerate ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button onClick={handleSaveLicensing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md shadow-indigo-600/20">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-6">
                  
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Email Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white">License Expiration</label>
                        <p className="text-xs text-slate-500">Get notified when client licenses are about to expire.</p>
                      </div>
                      <div onClick={() => setNotifications({...notifications, expiration: !notifications.expiration})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.expiration ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.expiration ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white">License Activations</label>
                        <p className="text-xs text-slate-500">Receive alerts for successful software activations.</p>
                      </div>
                      <div onClick={() => setNotifications({...notifications, activation: !notifications.activation})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.activation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.activation ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white">Buyer Activity</label>
                        <p className="text-xs text-slate-500">Notifications when Bulk Buyers assign seats.</p>
                      </div>
                      <div onClick={() => setNotifications({...notifications, buyerActivity: !notifications.buyerActivity})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.buyerActivity ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.buyerActivity ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 pt-6 border-t border-slate-100 dark:border-slate-800">System Alerts</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <label className="block text-sm font-semibold text-slate-900 dark:text-white">Browser Notifications</label>
                          {'Notification' in window && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              Notification.permission === 'granted'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : Notification.permission === 'denied'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {Notification.permission === 'granted' ? 'Permission Granted' : Notification.permission === 'denied' ? 'Permission Denied' : 'Default'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Enable real-time push notifications in this browser.</p>
                      </div>
                      <div onClick={handleToggleBrowserNotifications} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.browser ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.browser ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Verification & Test Channel */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Test Alert Channels</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Send a test notification to verify your active alert preferences and desktop push delivery.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={testingAlert}
                          onClick={() => handleSendTestAlert('expiration')}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Test Expiration Alert
                        </button>
                        <button
                          type="button"
                          disabled={testingAlert}
                          onClick={() => handleSendTestAlert('activation')}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Test Activation Alert
                        </button>
                        <button
                          type="button"
                          disabled={testingAlert}
                          onClick={() => handleSendTestAlert('buyerActivity')}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Test Buyer Activity Alert
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveNotifications} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md shadow-indigo-600/20">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-8">
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Change Password</h3>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <input type="password" placeholder="Current Password" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <input type="password" placeholder="New Password" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <input type="password" placeholder="Confirm New Password" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <button className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Authenticator App</p>
                        <p className="text-xs text-slate-500 mt-1">Use an app like Google Authenticator or Authy.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {companyProfile.twoFactorEnabled ? (
                          <>
                            <button 
                              onClick={handleDisable2FA}
                              className="px-3 py-1.5 border border-red-500 text-red-600 dark:text-red-400 font-bold rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              Disable 2FA
                            </button>
                            <button 
                              onClick={() => setIs2FAModalOpen(true)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-colors"
                            >
                              Reset 2FA
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => setIs2FAModalOpen(true)}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-colors"
                          >
                            Enable 2FA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Active Sessions</h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Windows PC - Chrome</p>
                            <p className="text-xs text-slate-500">San Francisco, CA â€¢ Active Now</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Current</span>
                      </div>
                    </div>
                    <button className="mt-4 text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
                      Sign out of all other sessions
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-8">
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Theme Mode</h3>
                    <div className="grid grid-cols-3 gap-4 max-w-lg">
                      <button onClick={() => setTheme('Light')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${theme === 'Light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span className="text-xs font-bold">Light</span>
                      </button>
                      <button onClick={() => setTheme('Dark')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${theme === 'Dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                        <span className="text-xs font-bold">Dark</span>
                      </button>
                      <button onClick={() => setTheme('System')} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${theme === 'System' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <span className="text-xs font-bold">System</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Font Size</h3>
                    <select 
                      value={fontSize} 
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-full max-w-sm border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Standard (Inter 14px)</option>
                      <option>Large (Inter 16px)</option>
                      <option>Compact (Inter 12px)</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Accent Color</h3>
                    <p className="text-xs text-slate-500 mb-4">Select the primary interactive accent color for buttons and highlights.</p>
                    <div className="flex space-x-3">
                      {[
                        { id: 'blue', bg: 'bg-[#4f46e5]', label: 'Indigo' },
                        { id: 'sky', bg: 'bg-[#0284c7]', label: 'Sky' },
                        { id: 'orange', bg: 'bg-[#ea580c]', label: 'Orange' },
                        { id: 'slate', bg: 'bg-[#475569]', label: 'Slate' }
                      ].map(c => (
                        <button 
                          key={c.id} 
                          type="button"
                          title={c.label}
                          onClick={() => {
                            setAccentColor(c.id)
                            applyAccentColor(c.id)
                          }} 
                          className={`w-9 h-9 rounded-full swatch-circle cursor-pointer ${c.bg} ${accentColor === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'} border border-transparent hover:scale-110 transition-transform shadow-sm`}
                        ></button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleSaveAppearance} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md shadow-indigo-600/20">
                      Save Appearance
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="space-y-8">
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Data Privacy</h3>
                    <p className="text-xs text-slate-500 mb-4">Control how your data is used and shared within the platform.</p>
                    <div className="space-y-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="mt-1 text-indigo-600 rounded focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer" 
                          checked={privacy.allowAnalytics} 
                          onChange={() => handleTogglePrivacy('allowAnalytics')}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Allow analytics tracking</p>
                          <p className="text-xs text-slate-500">Help us improve the product by sending anonymous usage data.</p>
                        </div>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="mt-1 text-indigo-600 rounded focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer" 
                          checked={privacy.publicDirectory} 
                          onChange={() => handleTogglePrivacy('publicDirectory')}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Public vendor directory</p>
                          <p className="text-xs text-slate-500">Allow your company profile to appear in the global LockStrata directory.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Export Data</h3>
                    <p className="text-xs text-slate-500 mb-4">Download a copy of all your company's data, including products, licenses, and buyers.</p>
                    <button 
                      onClick={handleDownloadData}
                      disabled={exportingData}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {exportingData ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Preparing Archive...</span>
                        </>
                      ) : (
                        <span>Request Data Archive</span>
                      )}
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-xs text-slate-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button 
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-lg text-xs transition-colors"
                    >
                      Delete Company Account
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'webhooks' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Vendor API Webhooks</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        webhookUrl?.trim()
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {webhookUrl?.trim() ? 'Configured & Active' : 'Unconfigured'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receive automated real-time HTTP POST notifications when licenses are generated, activated by customers, or when security anomalies occur on your software products.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Webhook Endpoint URL
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="url" 
                        placeholder="https://your-api.com/webhooks/lockstrata or https://hooks.slack.com/..."
                        value={webhookUrl} 
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleTestVendorWebhook}
                        disabled={testingWebhook || !webhookUrl?.trim()}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shrink-0"
                      >
                        {testingWebhook && (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{testingWebhook ? 'Verifying...' : 'Verify Webhook'}</span>
                      </button>
                    </div>
                  </div>

                  {webhookTestResult && (
                    <div className={`p-3 text-xs font-semibold rounded-lg flex items-center space-x-2 border animate-in fade-in duration-300 ${
                      webhookTestResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {webhookTestResult.success ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      <span>{webhookTestResult.message}</span>
                    </div>
                  )}

                  {webhookMsg.text && (
                    <div className={`p-3 text-xs font-semibold rounded-lg ${
                      webhookMsg.type === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}>
                      {webhookMsg.text}
                    </div>
                  )}

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={handleSaveWebhook}
                      disabled={savingWebhook}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {savingWebhook && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>{savingWebhook ? 'Saving...' : 'Save Webhook URL'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                    Dispatched Vendor Events
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-1">LICENSE_CREATED</div>
                      <p className="text-slate-500 dark:text-slate-400">Triggered whenever a retail customer or bulk buyer purchases or generates a license key for your software products.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-1">LICENSE_ACTIVATED</div>
                      <p className="text-slate-500 dark:text-slate-400">Triggered when an authorized device completes machine fingerprint verification and activates a seat.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-1">ANOMALY_ALERT</div>
                      <p className="text-slate-500 dark:text-slate-400">Triggered when suspicious multi-IP activity, rapid device activation spikes, or impossible travel is detected on your software.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-1">UNBIND_REQUEST</div>
                      <p className="text-slate-500 dark:text-slate-400">Triggered when an end-user submits a hardware unbind request to free up a seat for a new machine.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
      
      <TwoFactorSetupModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        userEmail={companyProfile.email} 
        onSuccess={() => {
          setSuccessMsg('2FA has been successfully enabled')
          setCompanyProfile({...companyProfile, twoFactorEnabled: true})
        }} 
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        isCompany={true}
      />
    </div>
  )
}
