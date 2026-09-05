import React, { useState, useEffect } from 'react'
import api from '../../services/api'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export default function CompanyActivityLog() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = async () => {
    setLoading(true)
    try {
      const res = await api.get('/companies/my-activity')
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : [])
      setActivities(list)
    } catch (err) {
      console.error('Failed to fetch company activity log', err)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
  }, [])

  const getActionBadge = (action) => {
    if (!action) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Activity</span>

    if (action.includes('ACTIVAT')) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">{action}</span>
    }
    if (action.includes('REVOKE') || action.includes('DEACTIVAT')) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800">{action}</span>
    }
    if (action.includes('RENEW')) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">{action}</span>
    }
    if (action.includes('PRODUCT') || action.includes('ISSUE')) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800">{action}</span>
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Activity Log</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail of product updates, license generations, activations, and revocations for your company.
          </p>
        </div>
        <button 
          onClick={fetchActivity} 
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center"
        >
          <svg className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh Log
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-400 text-sm">
                    Loading activity history...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                    <p className="mb-2 font-medium">No activity records recorded yet.</p>
                    <p className="text-xs text-slate-400">
                      As you issue licenses, update products, and customers activate devices, real events will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                activities.map((log, idx) => {
                  const date = safeDate(log.createdAt || log.timestamp)
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {date ? date.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-900 dark:text-slate-200">
                        {log.description || 'No description'}
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
