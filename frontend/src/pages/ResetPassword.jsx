import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const location = useLocation()
  
  // Extract token from URL search params
  const token = new URLSearchParams(location.search).get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    
    setLoading(true)
    setMessage('')
    setError('')
    try {
      await api.post(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
        newPassword,
        confirmPassword
      })
      setMessage('Password reset successfully. You can now login.')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Password</h2>
            <p className="text-sm text-slate-500 mt-2">Enter your new password below.</p>
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

          {!token ? (
             <div className="mt-8 text-center">
               <Link to="/forgot-password" className="text-sm font-bold text-[#0f52ba] hover:text-blue-800 transition-colors">
                 Request a new reset link
               </Link>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f52ba] outline-none transition-all"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f52ba] outline-none transition-all"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-[#0f52ba] hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
