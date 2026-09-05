import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import BulkBuyerSettings from './BulkBuyerSettings'
import CustomerSettings from './CustomerSettings'
import CompanySettings from './CompanySettings'
import { applyAccentColor } from '../utils/accentColor'

function Settings() {
  const navigate = useNavigate()

  // Form states to match the UI
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'Dark'
    if (saved === 'light') return 'Light'
    return 'System'
  })
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue')
  const [fontSize, setFontSize] = useState('Standard (Inter 14px)')
  const [notifications, setNotifications] = useState({ email: true, push: true })
  const [security, setSecurity] = useState({ twoFactor: true, timeout: '30 Minutes', ipWhitelist: '192.168.1.1' })
  const [autoRenewal, setAutoRenewal] = useState({ enabled: true, gracePeriod: '7', reminder: '30' })
  
  const { user, loading: authLoading } = useContext(AuthContext)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    if (user) {
      setUserRole(user.role || 'CUSTOMER')
      setUserName(user.fullName || user.username || 'User')
    }
  }, [user])


  // Handle Theme Toggle
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
      // System
      const match = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(match.matches)
      
      const listener = (e) => applyTheme(e.matches)
      match.addEventListener('change', listener)
      return () => match.removeEventListener('change', listener)
    }
  }, [theme])

  // Handle Font Size
  useEffect(() => {
    if (fontSize.includes('16px')) document.documentElement.style.fontSize = '16px'
    else if (fontSize.includes('12px')) document.documentElement.style.fontSize = '12px'
    else document.documentElement.style.fontSize = '14px'
  }, [fontSize])

  // Handle Accent Color (Global Override)
  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  if (!userRole) {
    return null; // prevent flash of UI while redirecting
  }

  if (userRole === 'BULK_BUYER') {
    return <BulkBuyerSettings userName={userName} userRole={userRole} />
  }

  if (userRole === 'COMPANY') {
    return (
      <CompanySettings 
        userName={userName} 
        userRole={userRole}
        theme={theme}
        setTheme={setTheme}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />
    )
  }

  if (userRole === 'CUSTOMER') {
    return (
      <CustomerSettings 
        userName={userName} 
        userRole={userRole}
        theme={theme}
        setTheme={setTheme}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] dark:bg-slate-950 font-sans text-slate-900 dark:text-white animate-in fade-in duration-500 transition-colors">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#eef2f6] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#0f52ba] text-white flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{userName}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{userRole}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all font-bold text-sm text-[#0f52ba]">
            <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="pt-6 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settings Menu</p>
          </div>

          <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-white shadow-sm text-slate-900 transition-all font-bold text-sm">
            <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>General</span>
          </button>
          
          <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all font-medium text-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            <span>Security & Access</span>
          </button>
          
          <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all font-medium text-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            <span>Notifications</span>
          </button>

          {userRole !== 'CUSTOMER' && (
            <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all font-medium text-sm">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              <span>Billing & Subscriptions</span>
            </button>
          )}
        </nav>
        
        <div className="p-4 space-y-2 mb-4">
          <button className="w-full flex items-center space-x-3 px-4 py-2 text-slate-600 hover:text-slate-900 transition-all font-medium text-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <span>Support</span>
          </button>
          <button onClick={() => navigate('/login')} className="w-full flex items-center space-x-3 px-4 py-2 text-slate-600 hover:text-slate-900 transition-all font-medium text-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        
        {/* TOP NAVBAR (Mocked to match image) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 transition-colors">
          <div className="flex items-center space-x-8">
            <h1 className="font-bold text-[#0f52ba] text-lg">LockStrata</h1>
          </div>
          <div className="flex items-center space-x-6">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Avatar" />
            </div>
          </div>
        </header>

        {/* SETTINGS CONTENT */}
        <main className="flex-1 overflow-y-auto p-8 lg:px-12 pb-24">
          
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-7 h-7 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">SYSTEM SETTINGS</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">Configure global environment variables and user preferences.</p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-6xl">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              
              {/* Appearance */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                  <h3 className="font-bold text-slate-900 dark:text-white">Appearance</h3>
                </div>
                
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Theme Mode</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setTheme('Light')} className={`p-4 rounded-lg border ${theme === 'Light' ? 'border-[#0f52ba] bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                      <svg className={`w-6 h-6 mb-2 ${theme === 'Light' ? 'text-[#0f52ba]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Light</span>
                    </button>
                    <button onClick={() => setTheme('Dark')} className={`p-4 rounded-lg border ${theme === 'Dark' ? 'border-[#0f52ba] bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                      <svg className={`w-6 h-6 mb-2 ${theme === 'Dark' ? 'text-[#0f52ba]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dark</span>
                    </button>
                    <button onClick={() => setTheme('System')} className={`p-4 rounded-lg border ${theme === 'System' ? 'border-[#0f52ba] bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} flex flex-col items-center justify-center transition-colors`}>
                      <svg className={`w-6 h-6 mb-2 ${theme === 'System' ? 'text-[#0f52ba]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
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
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0f52ba]"
                    >
                      <option>Standard (Inter 14px)</option>
                      <option>Large (Inter 16px)</option>
                      <option>Compact (Inter 12px)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ======================================= */}
              {/*           ADMIN ONLY SETTINGS           */}
              {/* ======================================= */}
              {userRole === 'ADMIN' && (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-6">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Global Security</h3>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Enforce 2FA System-Wide</p>
                        <div onClick={() => setSecurity({...security, twoFactor: !security.twoFactor})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${security.twoFactor ? 'bg-[#0f52ba]' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${security.twoFactor ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 mb-2">Global Session Timeout</p>
                        <select 
                          value={security.timeout} 
                          onChange={(e) => setSecurity({...security, timeout: e.target.value})}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba]"
                        >
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option>1 Hour</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        <h3 className="font-bold text-slate-900 dark:text-white">Auto-Renewal Rules</h3>
                      </div>
                      <div onClick={() => setAutoRenewal({...autoRenewal, enabled: !autoRenewal.enabled})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${autoRenewal.enabled ? 'bg-[#0f52ba]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoRenewal.enabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900 mb-2">Grace Period (Days)</p>
                        <input type="text" value={autoRenewal.gracePeriod} onChange={(e) => setAutoRenewal({...autoRenewal, gracePeriod: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 mb-2">Reminder (Days Prior)</p>
                        <input type="text" value={autoRenewal.reminder} onChange={(e) => setAutoRenewal({...autoRenewal, reminder: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba]" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ======================================= */}
              {/*         COMPANY ONLY SETTINGS           */}
              {/* ======================================= */}
              {userRole === 'COMPANY' && (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-6">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Developer API Keys</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Generate API keys to integrate LockStrata directly into your company's software products.</p>
                    
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Production Key</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">sk_live_*******************3f9a</p>
                      </div>
                      <button className="text-xs font-bold text-[#0f52ba] hover:underline">Revoke</button>
                    </div>
                    
                    <button className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-[#0f52ba] hover:bg-blue-50 font-bold text-xs flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      Generate New Key
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-4">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Billing Profile</h3>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Current Plan</span>
                      <span className="text-xs font-bold text-[#0f52ba] bg-blue-50 px-2 py-1 rounded">Enterprise Tier</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Payment Method</span>
                      <span className="text-xs text-slate-500">Visa ending in 4242</span>
                    </div>
                    <button className="w-full mt-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                      Manage Subscription
                    </button>
                  </div>
                </>
              )}

              {/* ======================================= */}
              {/*        CUSTOMER ONLY SETTINGS           */}
              {/* ======================================= */}
              {userRole === 'CUSTOMER' && (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-6">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Account Security</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900 mb-2">Change Password</p>
                        <input type="password" placeholder="Current Password" className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba] mb-2" />
                        <input type="password" placeholder="New Password" className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba]" />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Auth</p>
                        <div onClick={() => setSecurity({...security, twoFactor: !security.twoFactor})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${security.twoFactor ? 'bg-[#0f52ba]' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${security.twoFactor ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-4">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Active Sessions</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Manage devices currently logged into your account.</p>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between transition-colors">
                      <div className="flex items-center space-x-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Windows PC - Chrome</p>
                          <p className="text-[10px] text-green-600 font-bold mt-0.5">Current Session</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              
              {/* Notifications - Shared */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                <div className="flex items-center space-x-2 mb-6">
                  <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                  <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                </div>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Email Notifications</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Expiration, Activations, Alerts</p>
                      </div>
                    </div>
                    <div onClick={() => setNotifications({...notifications, email: !notifications.email})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.email ? 'bg-[#0f52ba]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </div>
                  </div>



                  {/* Push */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Browser Push</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Real-time browser popups</p>
                      </div>
                    </div>
                    <div onClick={() => setNotifications({...notifications, push: !notifications.push})} className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${notifications.push ? 'bg-[#0f52ba]' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Extra Right Column Features */}
              {userRole === 'ADMIN' && (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-6">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Email Templates</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg group hover:border-[#0f52ba] transition-colors cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Welcome Template</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Sent to new organization users</p>
                        </div>
                        <div className="flex items-center space-x-2 text-[#0f52ba]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg group hover:border-[#0f52ba] transition-colors cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Expiry Template</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Automated renewal warning</p>
                        </div>
                        <div className="flex items-center space-x-2 text-[#0f52ba]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 mb-4">
                      <svg className="w-5 h-5 text-[#0f52ba]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                      <h3 className="font-bold text-slate-900 dark:text-white">Backup & Restore</h3>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-800 mb-4 transition-colors">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">System Status</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">Last Backup: <span className="font-bold">2023-10-27 04:00 UTC</span></p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">Location: <span className="font-bold">AWS East (Cloud Archive)</span></p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-900 mb-2">Auto-Backup Schedule</p>
                      <select className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0f52ba]">
                        <option>Daily at 04:00</option>
                        <option>Weekly on Sunday</option>
                        <option>Monthly</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button className="flex flex-col items-center justify-center p-3 bg-[#0f52ba] text-white rounded-lg hover:bg-blue-800 transition-colors">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="text-[10px] font-bold">Create</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span className="text-[10px] font-bold">Export</span>
                      </button>
                      <button className="flex flex-col items-center justify-center p-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        <span className="text-[10px] font-bold">Restore</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Compliance Box */}
              {(userRole === 'ADMIN' || userRole === 'COMPANY') && (
                <div className="bg-[#eef4fd] dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 p-8 flex flex-col items-center text-center transition-colors">
                  <div className="w-12 h-12 bg-[#d1e0f8] text-[#0f52ba] rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  </div>
                  <h3 className="font-bold text-[#0f52ba] text-lg mb-2">Compliance Ready</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Your settings currently meet the standard for GDPR and SOC2 certification.</p>
                </div>
              )}

            </div>
          </div>
          
          {/* BOTTOM ACTION BUTTONS */}
          <div className="max-w-6xl mt-8 pt-6 border-t border-slate-200 flex justify-end space-x-4">
            <button className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
              Reset to Default
            </button>
            <button className="px-6 py-2.5 bg-[#0f52ba] rounded-lg text-white font-bold text-sm hover:bg-blue-800 transition-colors flex items-center shadow-md">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              Save All Settings
            </button>
          </div>

        </main>
      </div>
    </div>
  )
}

export default Settings
