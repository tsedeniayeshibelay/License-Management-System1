import React, { useState, useEffect } from 'react'
import api from '../../services/api'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export default function CompanyActivations() {
  const [activations, setActivations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deactivatingId, setDeactivatingId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const fetchActivations = async () => {
    setLoading(true)
    try {
      const res = await api.get('/activations/my-company')
      setActivations(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to fetch company activations', err)
      setActivations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivations()
  }, [])

  const handleDeactivate = async (id) => {
    if (!window.confirm(`Are you sure you want to deactivate this device activation?`)) return
    setDeactivatingId(id)
    setActionMessage(null)
    try {
      await api.put(`/activations/${id}/deactivate`)
      setActionMessage('Device activation has been successfully deactivated.')
      fetchActivations()
    } catch (err) {
      console.error('Failed to deactivate', err)
      alert(err.response?.data?.message || 'Failed to deactivate activation.')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Activations & Telemetry</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry and hardware activations for your company's software licenses.
          </p>
        </div>
        <button 
          onClick={fetchActivations} 
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center"
        >
          <svg className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          {actionMessage}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Device Name / OS</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Activated At</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                    Loading activations...
                  </td>
                </tr>
              ) : activations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <p className="mb-2 font-medium">No activation records found.</p>
                    <p className="text-xs text-slate-400">
                      Once customers activate your software on their devices, real telemetry will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                activations.map((act) => {
                  const actDate = safeDate(act.activatedAt);
                  const isOnline = act.status === 'ACTIVE' || act.isActive;
                  return (
                    <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              {act.deviceName || 'Personal Computer'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {act.os || 'Unknown OS'} &bull; {act.machineId ? act.machineId.substring(0, 12) + '...' : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200 text-xs">
                        {act.productName || 'Software Product'}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{act.customerName || 'Customer'}</p>
                        {act.customerEmail && (
                          <p className="text-[10px] text-slate-400">{act.customerEmail}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {actDate ? actDate.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {isOnline ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            DEACTIVATED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOnline && (
                          <button
                            disabled={deactivatingId === act.id}
                            onClick={() => handleDeactivate(act.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold text-xs transition-colors disabled:opacity-50"
                          >
                            {deactivatingId === act.id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
