import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'CUSTOMER',
    company: ''
  })
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Explicitly reset form data on mount to prevent browser credential managers from injecting values
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'CUSTOMER',
      company: ''
    })
    const timer = setTimeout(() => {
      setUnlocked(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    if ((formData.role === 'COMPANY' || formData.role === 'BULK_BUYER') && !formData.company.trim()) {
      setError("Company name is required for this account type.")
      return
    }
    
    setIsLoading(true)
    
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
      }
      if (formData.role === 'COMPANY' || formData.role === 'BULK_BUYER') {
        payload.company = formData.company.trim()
      }

      // 1. Register User
      await api.post('/auth/register', payload)

      // 2. Auto Login
      const loginRes = await api.post('/auth/login', {
        email: payload.email,
        password: payload.password
      })
      
      localStorage.setItem('token', loginRes.data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.token}`
      
      setMessage('Registration successful! Redirecting to dashboard...')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    } catch (err) {
      if (err.response?.data?.errors) {
        // Spring Boot Bean Validation errors (field → message map)
        const firstErrorKey = Object.keys(err.response.data.errors)[0]
        setError(err.response.data.errors[firstErrorKey])
      } else {
        // Service/controller errors come back as { error: "..." } or { message: "..." }
        setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Icons component helpers
  const IconUser = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
  const IconMail = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
  const IconLock = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
  const IconBriefcase = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
  const IconBuilding = () => <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create an account</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Join LockStrata today.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
        {/* Invisible decoy inputs to absorb aggressive browser autofill heuristics */}
        <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }}>
          <input type="text" name="fake_username_autofill_trap" tabIndex="-1" autoComplete="off" />
          <input type="password" name="fake_password_autofill_trap" tabIndex="-1" autoComplete="off" />
        </div>
        
        {/* Row 1: Full Name & Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
              <IconUser />
              <input name="fullName" type="text" required placeholder="John Doe" value={formData.fullName} onChange={handleChange} autoComplete="off"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
              <input 
                name="username" 
                type="text" 
                required 
                placeholder="johndoe" 
                value={formData.username} 
                onChange={handleChange}
                autoComplete="off"
                readOnly={!unlocked}
                onFocus={() => setUnlocked(true)}
                onClick={() => setUnlocked(true)}
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Email & Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <IconMail />
              <input 
                name="email" 
                type="email" 
                required 
                placeholder="john@company.com" 
                value={formData.email} 
                onChange={handleChange}
                autoComplete="off"
                readOnly={!unlocked}
                onFocus={() => setUnlocked(true)}
                onClick={() => setUnlocked(true)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Account Type</label>
            <div className="relative">
              <IconBriefcase />
              <select name="role" value={formData.role} onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-slate-300 appearance-none shadow-sm dark:shadow-none">
                <option value="CUSTOMER">I am a Customer</option>
                <option value="COMPANY">I represent a Company</option>
                <option value="BULK_BUYER">I am a Bulk Buyer</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Company Name (Conditional) */}
        {(formData.role === 'COMPANY' || formData.role === 'BULK_BUYER') && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1.5">
            <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider ml-1">Company Name</label>
            <div className="relative">
              <IconBuilding />
              <input name="company" type="text" required placeholder="Acme Corp" value={formData.company} onChange={handleChange} autoComplete="off"
                className="w-full pl-10 pr-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
            </div>
          </div>
        )}

        {/* Row 4: Password & Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <IconLock />
              <input 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••" 
                value={formData.password} 
                onChange={handleChange}
                autoComplete="new-password"
                readOnly={!unlocked}
                onFocus={() => setUnlocked(true)}
                onClick={() => setUnlocked(true)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest shadow-sm dark:shadow-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
            <div className="relative">
              <IconLock />
              <input 
                name="confirmPassword" 
                type="password" 
                required 
                placeholder="••••••••" 
                value={formData.confirmPassword} 
                onChange={handleChange}
                autoComplete="new-password"
                readOnly={!unlocked}
                onFocus={() => setUnlocked(true)}
                onClick={() => setUnlocked(true)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest shadow-sm dark:shadow-none" />
            </div>
          </div>
        </div>

        {error && <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl text-center font-medium">{error}</div>}
        {message && <div className="p-3 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center font-medium">{message}</div>}

        <button type="submit" disabled={isLoading}
          className="w-full py-3.5 mt-6 px-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
        </button>

        <div className="text-center mt-6">
          <span className="text-slate-500 dark:text-slate-400 text-sm">Already have an account? </span>
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold text-sm transition-colors">Sign In</Link>
        </div>
      </form>
    </div>
  )
}

export default Register
