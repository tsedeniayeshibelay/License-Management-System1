import { useState } from 'react'
import api from '../services/api'

export default function DeleteAccountModal({ isOpen, onClose, isCompany = false }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Please enter your current password.')
      return
    }

    try {
      setLoading(true)
      setError('')
      await api.post('/users/delete-account', { password })

      // Clear all auth and local session data
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('email')
      localStorage.removeItem('customer_preferences')
      localStorage.removeItem('company_licensing_prefs')
      localStorage.removeItem('company_notification_prefs')
      localStorage.removeItem('company_privacy_prefs')
      
      alert(
        isCompany
          ? 'Your company account has been successfully deleted. Active sessions and issued licenses have been terminated.'
          : 'Your account has been successfully deleted. Active sessions and activations have been terminated.'
      )
      window.location.href = '/login'
    } catch (err) {
      console.error('Account deletion error:', err)
      setError(err.response?.data?.message || err.response?.data || 'Failed to delete account. Please verify your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/50">
        
        {/* Header with Danger Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isCompany ? 'Delete Company Account' : 'Delete Account'}
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {isCompany ? 'Irreversible Company Deactivation' : 'Irreversible Account Deactivation'}
            </p>
          </div>
        </div>

        {/* Informational notice based on soft-delete strategy */}
        <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl p-3.5 mb-5 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <p className="font-semibold text-red-900 dark:text-red-300">Important consequences:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            {isCompany ? (
              <>
                <li>All active license activations on customer devices for your company products will be deactivated.</li>
                <li>Company products and issued licenses will be revoked and marked as archived.</li>
                <li>Your company login sessions will be terminated and login will be permanently disabled.</li>
                <li>Known login devices and notifications will be wiped.</li>
                <li>Historical licensing and audit logs remain intact for compliance integrity.</li>
              </>
            ) : (
              <>
                <li>All active license activations on your devices will be immediately deactivated.</li>
                <li>Your active login sessions will be terminated and login will be permanently disabled.</li>
                <li>Known login devices and notifications will be wiped.</li>
                <li>Historical licensing and audit logs remain intact for compliance integrity.</li>
              </>
            )}
          </ul>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm Current Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Deactivating...</span>
                </>
              ) : (
                <span>{isCompany ? 'Confirm Company Deletion' : 'Confirm Account Deletion'}</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
