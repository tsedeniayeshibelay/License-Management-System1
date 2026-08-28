import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`)
      setMessage('If an account exists with that email, a password reset link has been sent.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h2>
            <p className="text-sm text-slate-500 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f52ba] outline-none transition-all"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#0f52ba] hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-sm font-bold text-[#0f52ba] hover:text-blue-800 transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
