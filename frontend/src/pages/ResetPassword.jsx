import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract token from URL (from email link)
  const tokenFromUrl = new URLSearchParams(location.search).get('token')

  // Step 1: code entry (if no token in URL), Step 2: set new password
  const [step, setStep] = useState(tokenFromUrl ? 2 : 1)
  const [code, setCode] = useState('')
  const [token, setToken] = useState(tokenFromUrl || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

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

  // Password strength checker
  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600']
    return { score, label: labels[score], color: colors[score] }
  }

  const strength = getStrength(newPassword)

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (code.trim().length < 6) {
      setError('Please enter the full 6-digit code from your email.')
      return
    }
    setStep(2)
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (strength.score < 3) {
      setError('Password is too weak. Use uppercase, lowercase, numbers, and a special character.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: token || null,
        code: token ? null : code,
        newPassword,
        confirmPassword,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The code/link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const IconLock = () => (
    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative transition-colors duration-500">

      {/* Animated Mesh Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-transform duration-700 ease-out"
             style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-400/20 dark:bg-violet-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-transform duration-700 ease-out delay-75"
             style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}></div>
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 z-10 relative bg-white/70 dark:bg-slate-800/60 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)]">

        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-in zoom-in duration-500">
            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {success ? 'Password Reset!' : step === 1 ? 'Enter Reset Code' : 'Create New Password'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
            {success
              ? 'Your password has been updated. Redirecting you to login...'
              : step === 1
                ? 'Enter the 6-digit code we sent to your email.'
                : 'Choose a strong, unique password for your account.'}
          </p>
        </div>

        {/* Step Indicator (skip if came via link) */}
        {!tokenFromUrl && !success && (
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>
        )}

        {/* ── Success State ── */}
        {success && (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">You'll be redirected to the login page shortly.</p>
            <Link to="/login" className="mt-6 block w-full py-3.5 text-center font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all">
              Go to Sign In Now
            </Link>
          </div>
        )}

        {/* ── Step 1: Code Entry ── */}
        {!success && step === 1 && (
          <form onSubmit={handleCodeSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="off"
                className="w-full py-4 px-4 text-center text-3xl font-extrabold tracking-[0.5em] bg-white dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white shadow-sm"
              />
              <p className="text-xs text-slate-400 text-center mt-1">Check your email inbox and spam folder.</p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl text-center font-medium animate-in zoom-in duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={code.length < 6}
              className="w-full py-3.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>

            <div className="text-center">
              <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                Resend Code
              </Link>
            </div>
          </form>
        )}

        {/* ── Step 2: New Password ── */}
        {!success && step === 2 && (
          <form onSubmit={handleResetSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500" autoComplete="off">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative">
                <IconLock />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest shadow-sm"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showNewPw
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {/* Strength meter */}
              {newPassword && (
                <div className="space-y-1 mt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs ml-1" style={{ color: strength.score <= 2 ? '#f59e0b' : '#10b981' }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
              <div className="relative">
                <IconLock />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white tracking-widest shadow-sm"
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showConfirmPw
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 ml-1">Passwords do not match.</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-emerald-500 ml-1">Passwords match.</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl text-center font-medium animate-in zoom-in duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full py-3.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resetting...
                </span>
              ) : 'Reset Password'}
            </button>

            {!tokenFromUrl && (
              <button type="button" onClick={() => setStep(1)}
                className="mt-1 w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                Back to code entry
              </button>
            )}
          </form>
        )}

        {!success && (
          <div className="text-center mt-6">
            <Link to="/login" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
