import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import QRActivatePage from './pages/QRActivatePage'
import PaymentSuccess from './pages/PaymentSuccess'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import ForcePasswordChange from './pages/ForcePasswordChange'
import PublicLayout from './components/PublicLayout'
import Landing from './pages/Landing'
import ProductCatalog from './pages/ProductCatalog'

import About from './pages/About'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import Security from './pages/Security'
import Support from './pages/Support'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { applyAccentColor } from './utils/accentColor'
import { applyThemeMode, initThemeSystemListener, getSavedThemeMode } from './utils/theme'
import MaintenanceScreen from './components/MaintenanceScreen'
import ErrorBoundary from './components/ErrorBoundary'
import api from './services/api'

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // 1. Initial theme application based on canonical mode ('Light' | 'Dark' | 'System')
    const initialMode = getSavedThemeMode();
    applyThemeMode(initialMode);

    // 2. Initial accent color application
    const savedAccent = localStorage.getItem('accentColor') || 'indigo';
    applyAccentColor(savedAccent);

    // 3. System prefers-color-scheme listener with automatic cleanup
    const cleanupSystemListener = initThemeSystemListener();

    // 4. Cross-tab synchronization (only fires when another tab updates localStorage)
    const handleStorage = (e) => {
      if (e.key === 'themeMode' || e.key === 'theme') {
        const currentMode = getSavedThemeMode();
        applyThemeMode(currentMode);
      }
      if (e.key === 'accentColor') {
        const acc = localStorage.getItem('accentColor') || 'indigo';
        applyAccentColor(acc);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      cleanupSystemListener();
      window.removeEventListener('storage', handleStorage);
    };
  }, [])

  const [activations, setActivations] = useState([
    { id: 1, text: "Acme Corp activated 50 licenses", time: "Just now" },
    { id: 2, text: "Device MAC-8B9 activated (Offline)", time: "2 min ago" },
    { id: 3, text: "GlobalAdmin created product 'Analytics Pro'", time: "5 min ago" }
  ])

  useEffect(() => {
    const messages = [
      "New node activated in Frankfurt",
      "Webhook fired for Company XYZ",
      "License key validated successfully",
      "Offline activation payload verified",
      "Device MAC-1A2 registered",
      "API rate limit bucket refreshed"
    ]
    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)]
      setActivations(prev => {
        const nextId = prev.length > 0 ? prev[0].id + 1 : 1
        const updatedPrev = prev.map((item, idx) => ({ ...item, time: idx === 0 ? "1 min ago" : "Few mins ago" }))
        return [{ id: nextId, text: randomMsg, time: "Just now" }, ...updatedPrev].slice(0, 3)
      })
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e
    const { width, height, left, top } = currentTarget.getBoundingClientRect()
    const x = ((clientX - left) / width - 0.5) * 2
    const y = ((clientY - top) / height - 0.5) * 2
    setMousePos({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 })
  }

  // Maintenance Mode monitoring
  const [maintenanceConfig, setMaintenanceConfig] = useState(null)
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false)

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const res = await api.get('/system/public-config')
        if (res.data) {
          setMaintenanceConfig(res.data)
          const storedUser = localStorage.getItem('user')
          let parsedUser = null
          try { parsedUser = storedUser ? JSON.parse(storedUser) : null } catch (e) {}
          if (res.data.maintenanceMode && parsedUser?.role !== 'ADMIN') {
            setIsMaintenanceActive(true)
          } else {
            setIsMaintenanceActive(false)
          }
        }
      } catch (err) {
        // silent fail
      }
    }
    checkMaintenanceStatus()

    const handleMaintenanceEvent = (e) => {
      const storedUser = localStorage.getItem('user')
      let parsedUser = null
      try { parsedUser = storedUser ? JSON.parse(storedUser) : null } catch (err) {}
      if (parsedUser?.role !== 'ADMIN') {
        if (e.detail) {
          setMaintenanceConfig(prev => ({ ...(prev || {}), ...e.detail }))
        }
        setIsMaintenanceActive(true)
      }
    }

    window.addEventListener('lockstrata:maintenance', handleMaintenanceEvent)
    return () => window.removeEventListener('lockstrata:maintenance', handleMaintenanceEvent)
  }, [])

  const isLoginPage = window.location.pathname === '/login'
  if (isMaintenanceActive && !isLoginPage) {
    return (
      <MaintenanceScreen 
        config={maintenanceConfig} 
        onRetry={(newCfg) => {
          if (!newCfg?.maintenanceMode) {
            setIsMaintenanceActive(false)
          }
        }} 
      />
    )
  }

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="w-full min-h-screen relative">


          <Routes>
            <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/products" element={<ProductCatalog />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/security" element={<Security />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Route>

          <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'COMPANY', 'ADMIN', 'BULK_BUYER']}>
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/customer/activate/qr/:token" element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <QRActivatePage />
            </ProtectedRoute>
          } />
          
          <Route path="/force-change-password" element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'COMPANY', 'BULK_BUYER', 'ADMIN']}>
              <ForcePasswordChange />
            </ProtectedRoute>
          } />

          <Route path="/bulk-buyer/dashboard" element={
            <ProtectedRoute allowedRoles={['BULK_BUYER']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'COMPANY', 'BULK_BUYER', 'ADMIN']}>
              <Settings />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'COMPANY', 'BULK_BUYER', 'ADMIN']}>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/register" element={
            <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white transition-colors duration-500 relative">

              {/* Left Side: Branding & Beautiful Graphic (Hidden on mobile) */}
              <div 
                className="hidden lg:flex lg:w-1/2 relative bg-slate-100 dark:bg-slate-900 items-center justify-center overflow-hidden cursor-crosshair perspective-1000 transition-colors duration-500 border-r border-slate-200 dark:border-transparent"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-200 via-slate-100 to-slate-100 dark:from-blue-900/40 dark:via-slate-900 dark:to-slate-900 transition-transform duration-500 ease-out"
                     style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}></div>
                     
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-600/20 blur-3xl rounded-full transition-transform duration-300 ease-out"
                     style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}></div>
                     
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/20 blur-3xl rounded-full transition-transform duration-300 ease-out"
                     style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}></div>
                
                <div className="relative z-10 text-center px-12 transition-transform duration-200 ease-out w-full"
                     style={{ transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)` }}>
                  
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <svg className="w-14 h-14 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 11V7a4 4 0 118 0v4"></path>
                    </svg>
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                      LockStrata
                    </h1>
                  </div>
                  
                  <p className="text-xl text-slate-600 dark:text-slate-300 font-light leading-relaxed mb-12">
                    The next-generation platform for software licensing, offline activation, and device management.
                  </p>
                  
                  <div 
                    className="p-6 bg-white/60 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl mx-auto max-w-sm transition-transform duration-200 ease-out group"
                    style={{ 
                      transform: `rotateX(${mousePos.y * -15}deg) rotateY(${mousePos.x * 15}deg) scale(1.05)`,
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-6" style={{ transform: 'translateZ(20px)' }}>
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] dark:shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)] dark:shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] dark:shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    </div>
                    <div className="space-y-4" style={{ transform: 'translateZ(30px)' }}>
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                        <div className="h-4 w-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold rounded flex items-center justify-center">ACTIVE</div>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 w-2/3 group-hover:w-full transition-all duration-1000"></div>
                      </div>
                      <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>

                  <div className="mt-12 text-left mx-auto max-w-sm transition-transform duration-200 ease-out" 
                       style={{ transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px)` }}>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Live Network Activity</h3>
                    </div>
                    <div className="space-y-3">
                      {activations.map(act => (
                        <div key={act.id} className="p-3 bg-white/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 rounded-lg flex justify-between items-center animate-in slide-in-from-right-4 fade-in duration-500 shadow-sm dark:shadow-none">
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate mr-4">{act.text}</span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-medium">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Side: The Form */}
              <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative z-10 bg-slate-50 dark:bg-slate-900 shadow-[-20px_0_40px_rgba(0,0,0,0.05)] dark:shadow-[-20px_0_40px_rgba(0,0,0,0.3)] transition-colors duration-500">
                <Register />
              </div>

            </div>
          } />
                <Route path="/payment-success" element={<PaymentSuccess />} />
          </Routes>


        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
