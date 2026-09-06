import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`)
      setSent(true)
    } catch (err) {
      // Even on error, show sent state so we don't expose if email exists
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-in zoom-in duration-500">
            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {sent ? 'Check Your Email' : 'Forgot Password?'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
            {sent
              ? "We've sent a reset code and link to your inbox."
              : "Enter your email and we'll send you a reset code + direct link."}
          </p>
        </div>

        {sent ? (
          /* ── Success State ── */
          <div className="animate-in fade-in zoom-in duration-500">
            {/* Email Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl">
                <span className="text-blue-500 mt-0.5 text-lg">①</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Click the link in the email</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Opens the reset page automatically.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/40 rounded-xl">
                <span className="text-slate-400 mt-0.5 text-lg">②</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Or enter the 6-digit code</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Go to <Link to="/reset-password" className="text-blue-500 underline">Reset Password</Link> and enter the code manually.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/40 rounded-xl">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300">The code and link expire in <strong>15 minutes</strong>.</p>
              </div>
            </div>

            <Link
              to="/reset-password"
              className="block w-full py-3.5 text-center font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Enter Reset Code
            </Link>

            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-3 w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              Try a different email
            </button>
          </div>
        ) : (
          /* ── Form State ── */
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white shadow-sm dark:shadow-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl text-center font-medium animate-in zoom-in duration-300">
                {error}
              </div>
            )}

            <div className="pt-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 px-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : 'Send Reset Code'}
              </button>
            </div>

            <div className="text-center mt-4 animate-in fade-in duration-500 delay-300">
              <Link to="/login" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
