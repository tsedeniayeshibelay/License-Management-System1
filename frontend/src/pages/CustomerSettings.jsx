import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import TwoFactorSetupModal from '../components/TwoFactorSetupModal'
import DeleteAccountModal from '../components/DeleteAccountModal'
import { DocumentationModal, ContactSupportModal, SystemStatusModal, FAQModal } from '../components/SupportModals'
import { applyAccentColor } from '../utils/accentColor'

function CustomerSettings({ 
  userName, 
  userRole,
  theme, 
  setTheme, 
  accentColor, 
  setAccentColor, 
  fontSize, 
  setFontSize 
}) {
  const navigate = useNavigate()
  const location = useLocation()

  // Layout state
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'General')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Settings State
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [dashboardPrefs, setDashboardPrefs] = useState({
    landingPage: 'Dashboard',
    dataDensity: 'Comfortable (Default)',
    showQuickActions: true
  })

  // Notifications (Local State)
  const [notifications, setNotifications] = useState({
    expiration: true,
    activation: true,
    failedActivation: true,
    deviceActivation: true,
    unbindUpdates: true,
    security: true,
    email: true,
    push: true
  })

  // Profile State (From Backend)
  const [profile, setProfile] = useState({
    fullName: '',
    email: '', // Read only
    phone: '',
    twoFactorEnabled: false
  })
  
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false)

  // Security State
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactor: true,
    loginAlerts: true,
    sessionTimeout: '30 minutes'
  })

  const [knownDevices, setKnownDevices] = useState([])

  // Privacy State
  const [privacy, setPrivacy] = useState({
    allowAnalytics: true
  })

  // Data & Support Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // Fetch Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await api.get('/users/profile')
        setProfile({
          fullName: res.data.fullName || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          twoFactorEnabled: res.data.twoFactorEnabled || false
        })
        if (res.data.preferences) {
          try {
            const prefs = JSON.parse(res.data.preferences)
            if (prefs.theme) setTheme(prefs.theme)
            if (prefs.accentColor) setAccentColor(prefs.accentColor)
            if (prefs.fontSize) setFontSize(prefs.fontSize)
            if (prefs.dashboardPrefs) setDashboardPrefs(prefs.dashboardPrefs)
            if (prefs.notifications) setNotifications(prefs.notifications)
            if (prefs.privacy) setPrivacy(prefs.privacy)
            if (prefs.security) {
              setSecurity(prev => ({
                ...prev,
                loginAlerts: prefs.security.loginAlerts !== undefined ? prefs.security.loginAlerts : true,
                sessionTimeout: prefs.security.sessionTimeout || '30 minutes'
              }))
            }
          } catch (e) {
            console.error('Failed to parse preferences', e)
          }
        } else {
          const local = localStorage.getItem('customer_preferences')
          if (local) {
            try {
              const prefs = JSON.parse(local)
              if (prefs.dashboardPrefs) setDashboardPrefs(prefs.dashboardPrefs)
              if (prefs.theme) setTheme(prefs.theme)
              if (prefs.accentColor) setAccentColor(prefs.accentColor)
              if (prefs.fontSize) setFontSize(prefs.fontSize)
              if (prefs.notifications) setNotifications(prefs.notifications)
              if (prefs.privacy) setPrivacy(prefs.privacy)
              if (prefs.security) {
                setSecurity(prev => ({
                  ...prev,
                  loginAlerts: prefs.security.loginAlerts !== undefined ? prefs.security.loginAlerts : true,
                  sessionTimeout: prefs.security.sessionTimeout || '30 minutes'
                }))
              }
            } catch (e) {}
          }
        }

        try {
          const devRes = await api.get('/users/profile/devices')
          setKnownDevices(devRes.data || [])
        } catch (e) {}
      } catch (err) {
        console.error('Failed to fetch profile', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('')
        setErrorMsg('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg, errorMsg])

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      await api.put('/users/profile', {
        fullName: profile.fullName,
        phone: profile.phone
      })
      setSuccessMsg('Profile updated successfully.')
    } catch (err) {
      console.error('Failed to update profile', err)
      setErrorMsg('Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    try {
      setLoading(true)
      await api.post(`/auth/2fa/disable?email=${encodeURIComponent(profile.email)}`)
      setProfile(prev => ({ ...prev, twoFactorEnabled: false }))
      setSuccessMsg("Two-Factor Authentication has been successfully disabled.")
    } catch (err) {
      console.error("Failed to disable 2FA", err)
      setErrorMsg(err.response?.data?.message || "Failed to disable 2FA.")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAnalytics = async () => {
    const newVal = !privacy.allowAnalytics
    setPrivacy({ allowAnalytics: newVal })
    try {
      let currentPrefs = {}
      try {
        const stored = localStorage.getItem('customer_preferences')
        if (stored) currentPrefs = JSON.parse(stored)
      } catch (e) {}
      const updatedPrefs = { ...currentPrefs, privacy: { allowAnalytics: newVal } }
      await api.put('/users/profile', {
        fullName: profile.fullName,
        preferences: JSON.stringify(updatedPrefs)
      })
      localStorage.setItem('customer_preferences', JSON.stringify(updatedPrefs))
      setSuccessMsg(newVal ? 'Anonymous analytics enabled.' : 'Anonymous analytics disabled.')
    } catch (err) {
      console.error('Failed to update analytics setting', err)
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
      downloadAnchor.setAttribute('download', `LockStrata_Account_Export_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      setSuccessMsg('Account data exported successfully.')
    } catch (err) {
      console.error('Data export error:', err)
      setErrorMsg('Failed to export account data.')
    } finally {
      setExportingData(false)
    }
  }

  const handleSavePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      setErrorMsg('New passwords do not match.')
      return
    }
    try {
      setLoading(true)
      await api.put('/users/profile/password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
        confirmPassword: security.confirmPassword,
        fullName: profile.fullName // required by DTO if not partial
      })
      setSuccessMsg('Password updated successfully.')
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      console.error('Failed to update password', err)
      setErrorMsg('Failed to update password. Check your current password.')
    } finally {
      setLoading(false)
    }
  }

  // Handle individual dashboard preference changes with immediate local dispatch
  const handleDashboardPrefChange = (field, value) => {
    const updated = { ...dashboardPrefs, [field]: value }
    setDashboardPrefs(updated)
    
    let currentPrefs = {}
    try {
      const stored = localStorage.getItem('customer_preferences')
      if (stored) currentPrefs = JSON.parse(stored)
    } catch (e) {}

    const fullPrefs = {
      ...currentPrefs,
      theme,
      accentColor,
      fontSize,
      dashboardPrefs: updated,
      notifications,
      privacy,
      security: {
        loginAlerts: security.loginAlerts,
        sessionTimeout: security.sessionTimeout
      }
    }
    localStorage.setItem('customer_preferences', JSON.stringify(fullPrefs))
    window.dispatchEvent(new CustomEvent('preferences-changed', { detail: fullPrefs }))
  }

  // Handle local state saves (now persisting to backend)
  const handleSaveLocal = async () => {
    try {
      setLoading(true)
      const prefs = {
        theme,
        accentColor,
        fontSize,
        dashboardPrefs,
        notifications,
        privacy,
        security: {
          loginAlerts: security.loginAlerts,
          sessionTimeout: security.sessionTimeout
        }
      }
      await api.put('/users/profile', {
        fullName: profile.fullName,
        preferences: JSON.stringify(prefs)
      })
      localStorage.setItem('customer_preferences', JSON.stringify(prefs))
      localStorage.setItem('session_timeout', security.sessionTimeout)
      window.dispatchEvent(new CustomEvent('preferences-changed', { detail: prefs }))
      setSuccessMsg('Dashboard preferences saved successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Failed to save preferences', err)
      setErrorMsg('Failed to save preferences.')
      setTimeout(() => setErrorMsg(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSecurity = async () => {
    try {
      setLoading(true)
      let currentPrefs = {}
      try {
        const stored = localStorage.getItem('customer_preferences')
        if (stored) currentPrefs = JSON.parse(stored)
      } catch (e) {}

      const updatedPrefs = {
        ...currentPrefs,
        theme,
        accentColor,
        fontSize,
        dashboardPrefs,
        notifications,
        privacy,
        security: {
          loginAlerts: security.loginAlerts,
          sessionTimeout: security.sessionTimeout
        }
      }

      await api.put('/users/profile', {
        fullName: profile.fullName,
        preferences: JSON.stringify(updatedPrefs)
      })
      localStorage.setItem('customer_preferences', JSON.stringify(updatedPrefs))
      localStorage.setItem('session_timeout', security.sessionTimeout)
      window.dispatchEvent(new CustomEvent('preferences-changed', { detail: updatedPrefs }))
      setSuccessMsg('Security preferences saved successfully.')
    } catch (err) {
      console.error('Failed to save security preferences', err)
      setErrorMsg('Failed to save security preferences.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'Privacy & Data', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
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
            {/* Appearance Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Appearance</h3>
              <p className="text-xs text-slate-500 mb-6">Customize how LockStrata looks and feels.</p>
              
              <div className="mb-8">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Theme Mode</p>
                <div className="flex space-x-3">
                  {['Light', 'Dark', 'System'].map(mode => (
                    <button key={mode} onClick={() => setTheme(mode)} className={`px-5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${theme === mode ? 'border-[#0f52ba] bg-blue-50 text-[#0f52ba] dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Accent Color</p>
                <div className="flex space-x-4">
                  {['blue', 'sky', 'orange', 'slate'].map(color => {
                    let bg = ''
                    if (color === 'blue') bg = 'bg-[#0f52ba]'
                    if (color === 'sky') bg = 'bg-sky-500'
                    if (color === 'orange') bg = 'bg-orange-500'
                    if (color === 'slate') bg = 'bg-slate-600'
                    
                    return (
                      <button 
                        key={color} 
                        onClick={() => {
                          setAccentColor(color);
                          applyAccentColor(color);
                        }} 
                        className={`w-10 h-10 rounded-full swatch-circle cursor-pointer ${bg} ${accentColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : ''} border border-transparent flex items-center justify-center transition-all hover:scale-110`}
                      >
                        {accentColor === color && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Font Size</p>
                <div className="flex space-x-3">
                  {['Compact (Inter 12px)', 'Standard (Inter 14px)', 'Large (Inter 16px)'].map(size => (
                    <button 
                      key={size} 
                      onClick={() => setFontSize(size)} 
                      className={`px-5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${fontSize === size ? 'border-[#0f52ba] bg-blue-50 text-[#0f52ba] dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {size.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Dashboard Preferences Section */}
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#0f52ba]"
                  >
                    <option value="Dashboard">Dashboard</option>
                    <option value="My Licenses">My Licenses</option>
                    <option value="Activated Devices">Activated Devices</option>
                    <option value="Orders & Invoices">Orders & Invoices</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">The page you see when you first log in.</p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">Table Data Density</label>
                  <select 
                    value={dashboardPrefs.dataDensity} 
                    onChange={e => handleDashboardPrefChange('dataDensity', e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#0f52ba]"
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

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors flex items-center"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  View Dashboard
                </button>
                <button 
                  onClick={handleSaveLocal} 
                  disabled={loading}
                  className="px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )
      
      case 'Profile':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Personal Information</h3>
              <p className="text-xs text-slate-500 mb-6">Manage your personal account information.</p>
              
              <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
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

              <div className="grid grid-cols-[120px_1fr] gap-y-6 text-xs items-center max-w-lg">
                <div className="font-bold text-slate-600 dark:text-slate-400">Full Name</div>
                <input 
                  type="text" 
                  value={profile.fullName} 
                  onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]"
                />
                
                <div className="font-bold text-slate-600 dark:text-slate-400">Email</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-500 dark:text-slate-500 cursor-not-allowed">
                  {profile.email || 'Loading...'}
                </div>
                
                <div className="font-bold text-slate-600 dark:text-slate-400">Phone</div>
                <input 
                  type="text" 
                  value={profile.phone} 
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]"
                />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button 
                  onClick={handleSaveProfile} 
                  disabled={loading}
                  className="px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )
        
      case 'Security':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Account Security</h3>
              <p className="text-xs text-slate-500 mb-6">Protect your LockStrata account and manage active sessions.</p>

              <div className="max-w-lg mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Current Password</label>
                    <input 
                      type="password" 
                      value={security.currentPassword}
                      onChange={(e) => setSecurity({...security, currentPassword: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">New Password</label>
                    <input 
                      type="password" 
                      value={security.newPassword}
                      onChange={(e) => setSecurity({...security, newPassword: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={security.confirmPassword}
                      onChange={(e) => setSecurity({...security, confirmPassword: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba]" 
                    />
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={handleSavePassword}
                      disabled={loading || !security.currentPassword || !security.newPassword}
                      className="px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Active Sessions</h4>
                <div className="space-y-3">
                  {knownDevices.length > 0 ? (
                    knownDevices.map(d => {
                      const isCurrent = d.deviceIdentifier === localStorage.getItem('app_device_id')
                      return (
                        <div key={d.id} className={`flex items-center justify-between p-4 ${isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'} border rounded-lg`}>
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${isCurrent ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{d.deviceName || 'Recognized Browser'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                IP: {d.ipAddress || 'N/A'} • Last active: {d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleString() : 'Recently'}
                              </p>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                              Current Session
                            </span>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">This Device</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Current Session</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Additional Security</h4>
                <div className="space-y-6 max-w-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-[10px] text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                      {profile.twoFactorEnabled && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Enabled</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      {profile.twoFactorEnabled ? (
                        <>
                          <button 
                            onClick={handleDisable2FA}
                            className="text-xs font-bold text-red-600 dark:text-red-400 border border-red-500 rounded px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            Disable 2FA
                          </button>
                          <button 
                            onClick={() => setIs2FAModalOpen(true)}
                            className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            Reset 2FA
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setIs2FAModalOpen(true)}
                          className="text-xs font-bold text-[#0f52ba] border border-[#0f52ba] rounded px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Login Alerts</p>
                      <p className="text-[10px] text-slate-500 mt-1">Get notified of new logins on unrecognized devices.</p>
                    </div>
                    <Toggle checked={security.loginAlerts} onChange={() => setSecurity({...security, loginAlerts: !security.loginAlerts})} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Session Timeout</p>
                      <p className="text-[10px] text-slate-500 mt-1">Automatically log out after inactivity.</p>
                    </div>
                    <select value={security.sessionTimeout} onChange={e => setSecurity({...security, sessionTimeout: e.target.value})} className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#0f52ba]">
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                    </select>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleSaveSecurity}
                      disabled={loading}
                      className="px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Save Security Preferences
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )
        
      case 'Notifications':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Notification Preferences</h3>
              <p className="text-xs text-slate-500 mb-6">Choose which LockStrata events you want to be notified about.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  {[
                    { id: 'expiration', title: 'License Expiration Alerts', desc: 'Get notified about your expiring licenses', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'activation', title: 'License Activation Alerts', desc: 'Get notified when your license is activated', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'failedActivation', title: 'Failed Activation Alerts', desc: 'Get notified about failed attempts', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'deviceActivation', title: 'Device Activation Alerts', desc: 'Get notified when a new device connects', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                    { id: 'unbindUpdates', title: 'Unbind Request Updates', desc: 'Status updates on your unbind requests', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
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
                      <Toggle checked={notifications[item.id]} onChange={() => setNotifications({...notifications, [item.id]: !notifications[item.id]})} />
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
                      <Toggle checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Browser Push</span>
                      </div>
                      <Toggle checked={notifications.push} onChange={async () => {
                        const nextVal = !notifications.push
                        if (nextVal && 'Notification' in window && Notification.permission !== 'granted') {
                          try {
                            const perm = await Notification.requestPermission()
                            if (perm !== 'granted') {
                              setErrorMsg('Browser push permission not granted')
                              setTimeout(() => setErrorMsg(''), 3000)
                              return
                            }
                          } catch (err) {}
                        }
                        setNotifications({ ...notifications, push: nextVal })
                      }} />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button onClick={handleSaveLocal} className="px-6 py-2 bg-[#0f52ba] rounded-lg text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm">
                      Save Preferences
                    </button>
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
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Data Management</h3>
              <p className="text-xs text-slate-500 mb-6">Manage your personal data and privacy preferences.</p>

              <div className="space-y-8 max-w-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Allow Anonymous Analytics</p>
                    <p className="text-[10px] text-slate-500 mt-1">Help improve LockStrata with anonymous data</p>
                  </div>
                  <Toggle checked={privacy.allowAnalytics} onChange={handleToggleAnalytics} />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>Download My Data</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Export a copy of your personal account data</p>
                  </div>
                  <button 
                    onClick={handleDownloadData}
                    disabled={exportingData}
                    className="relative px-4 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0f52ba] dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50"
                  >
                    {exportingData ? 'Exporting...' : 'Request Export'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Delete Account</p>
                    <p className="text-[10px] text-slate-500 mt-1">Permanently deactivate your account and data</p>
                  </div>
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="relative px-4 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/50 transition-colors"
                  >
                    Delete Account
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
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 transition-colors group"
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
      
      {/* SIDEBAR NAVIGATION */}
      <div className={`${isMobileMenuOpen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 flex' : 'hidden'} md:flex md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col transition-colors`}>
        
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 md:hidden">
          <h2 className="font-bold text-lg text-[#0f52ba]">Settings</h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Sidebar Header */}
        <div className="p-6 hidden md:block">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Settings</h2>
          <p className="text-xs text-slate-500">Manage your personal account and preferences.</p>
        </div>

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

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center space-x-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors">
        
        {/* Header Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 transition-colors">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">{activeTab}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {successMsg && (
              <div className="animate-in fade-in slide-in-from-top-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold flex items-center shadow-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="animate-in fade-in slide-in-from-top-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded text-xs font-bold flex items-center shadow-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {errorMsg}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
      <TwoFactorSetupModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        userEmail={profile.email} 
        onSuccess={() => {
          setSuccessMsg('2FA has been successfully enabled')
          setProfile({...profile, twoFactorEnabled: true})
        }} 
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      <ContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onTicketCreated={(ticket) => setSuccessMsg(`Support ticket #${ticket.id} submitted successfully!`)}
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

export default CustomerSettings
