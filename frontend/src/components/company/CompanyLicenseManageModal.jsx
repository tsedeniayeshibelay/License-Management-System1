import React, { useState, useEffect } from 'react'
import api from '../../services/api'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export default function CompanyLicenseManageModal({ license, isOpen, onClose, onSuccess }) {
  const [activations, setActivations] = useState([])
  const [loadingActivations, setLoadingActivations] = useState(false)
  const [renewDate, setRenewDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && license?.id) {
      fetchActivations()
      // Default renew date based on configured default duration in company licensing settings
      const currentExp = safeDate(license.expiryDate)
      const base = currentExp && currentExp > new Date() ? currentExp : new Date()
      const defaultRenew = new Date(base)
      let durationPref = '1 Year'
      try {
        const saved = JSON.parse(localStorage.getItem('company_licensing_prefs') || '{}')
        if (saved.defaultDuration) durationPref = saved.defaultDuration
      } catch (e) {}

      if (durationPref === '1 Month') {
        defaultRenew.setMonth(defaultRenew.getMonth() + 1)
      } else if (durationPref === 'Lifetime') {
        defaultRenew.setFullYear(defaultRenew.getFullYear() + 100)
      } else {
        defaultRenew.setFullYear(defaultRenew.getFullYear() + 1)
      }
      setRenewDate(defaultRenew.toISOString().split('T')[0])
      setMessage(null)
      setError(null)
    }
  }, [isOpen, license])

  const fetchActivations = async () => {
    setLoadingActivations(true)
    try {
      const res = await api.get(`/activations/license/${license.id}`)
      setActivations(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to fetch activations', err)
      setActivations([])
    } finally {
      setLoadingActivations(false)
    }
  }


  if (!isOpen || !license) return null

  const pName = license.productName || license.product?.name || 'Software Product'
  const buyerName = license.customerName || license.user?.fullName || license.user?.username || license.company?.name || 'Unknown'
  const expDate = safeDate(license.expiryDate)

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to revoke this license?')) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await api.delete(`/licenses/${license.id}`)
      setMessage('License has been revoked.')
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke license.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReactivate = async () => {
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await api.put(`/licenses/${license.id}/reactivate`)
      setMessage('License has been reactivated successfully!')
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate license.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRenew = async (e) => {
    e.preventDefault()
    if (!renewDate) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await api.put(`/licenses/${license.id}/renew?newExpiryDate=${renewDate}`)
      setMessage(`License renewed successfully until ${renewDate}!`)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to renew license.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivateDevice = async (activationId) => {
    if (!window.confirm('Are you sure you want to deactivate this device?')) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await api.put(`/activations/${activationId}/deactivate`)
      setMessage('Device activation successfully deactivated.')
      fetchActivations()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate device activation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Manage License
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  license.status === 'ACTIVE' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : license.status === 'REVOKED'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {license.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {message && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}

          {/* Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Buyer</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{buyerName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">License Type</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{license.licenseType || 'Volume'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Expires</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {expDate ? expDate.toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Bound Devices / Activations */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Bound Active Activations ({activations.filter(a => a.isActive).length})
            </h4>
            {loadingActivations ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading bound activations...</div>
            ) : activations.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No active devices currently bound to this license.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Device Name</th>
                      <th className="px-4 py-2.5">Activated At</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {activations.map(act => (
                      <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{act.deviceName || act.device?.deviceName || act.device?.machineId || `Device #${act.deviceId}`}</td>
                        <td className="px-4 py-2.5">{safeDate(act.activatedAt)?.toLocaleString() || 'N/A'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            act.isActive 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {act.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {act.isActive && (
                            <button
                              disabled={submitting}
                              onClick={() => handleDeactivateDevice(act.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Renew License Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Renew / Extend Expiration
            </h4>
            <form onSubmit={handleRenew} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="date"
                required
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="w-full sm:w-auto flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
              >
                Renew License
              </button>
            </form>
          </div>

          {/* Revoke / Reactivate Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {license.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRevoke}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                  Revoke License
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReactivate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Reactivate License
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
