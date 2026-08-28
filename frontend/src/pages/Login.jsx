import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../services/api'

function getOrCreateDeviceId() {
  let id = localStorage.getItem('app_device_id')
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('app_device_id', id)
  }
  return id
}

function getFriendlyDeviceName() {
  const ua = navigator.userAgent
  let browser = 'Browser'
  let os = 'Unknown OS'

  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'

  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  return `${browser} on ${os}`
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: ''
  })
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [inactivityNotice, setInactivityNotice] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // check if redirected due to inactivity
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('reason') === 'inactivity') {
      setInactivityNotice(true)
    }
  }, [location.search])

  // subtle parallax effect on background
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const deviceId = getOrCreateDeviceId()
      const deviceName = getFriendlyDeviceName()

      const payload = {
        ...formData,
        deviceId,
        deviceName
      }

      const response = await api.post('/auth/login', payload)
      
      if (response.data.requires2FA) {
        setStep(2)
        setError('')
      } else {
        const token = response.data.token
        localStorage.setItem('token', token)
        localStorage.setItem('last_active_timestamp', Date.now().toString())

        // If backend flagged mustChangePassword, redirect to forced password change first
        if (response.data.mustChangePassword) {
          window.location.href = '/force-change-password'
        } else {
          const returnUrl = location.state?.returnUrl || '/dashboard'
          window.location.href = returnUrl
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Invalid credentials or 2FA code.')
    } finally {
      setIsLoading(false)
    }
  }

  const IconUser = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
  const IconLock = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative transition-colors duration-500">
      
      {/* Animated Mesh Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-transform duration-700 ease-out"
             style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-transform duration-700 ease-out delay-75"
             style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}></div>
      </div>

      {/* Centered Glass Card */}
      <div className="w-full max-w-md p-8 sm:p-10 z-10 relative bg-white/70 dark:bg-slate-800/60 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-in zoom-in duration-500">
            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {step === 1 ? 'Welcome Back' : 'Two-Factor Auth'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {step === 1 ? 'Enter your credentials to access the portal' : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {inactivityNotice && (
          <div className="mb-6 p-3 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-center font-medium animate-in zoom-in duration-300">
            ⏰ You were automatically logged out due to inactivity. Please sign in again.
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <IconUser />
                  <input name="email" type="email" required placeholder="you@company.com" value={formData.email} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
                </div>
              </div>
              
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <IconLock />
                  <input name="password" type="password" required placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={formData.password} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest shadow-sm dark:shadow-none" />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Authenticator Code</label>
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
                <input name="twoFactorCode" type="text" required placeholder="000000" maxLength="6" value={formData.twoFactorCode} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest text-center text-lg font-bold shadow-sm dark:shadow-none" />
              </div>
            </div>
          )}

          {error && <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl text-center font-medium animate-in zoom-in duration-300">{error}</div>}

          <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 px-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </div>
          
          <div className="text-center mt-6 animate-in fade-in duration-500 delay-500">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold text-sm transition-colors">Create Account</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
