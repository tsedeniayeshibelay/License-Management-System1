import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function MaintenanceScreen({ config, onRetry }) {
  const [checking, setChecking] = useState(false)
  const platformName = config?.platformName || 'LockStrata Enterprise'
  const supportEmail = config?.supportEmail || 'support@lockstrata.com'

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const res = await api.get('/system/public-config')
      if (res.data && !res.data.maintenanceMode) {
        window.location.reload()
      } else if (onRetry) {
        onRetry(res.data)
      }
    } catch (err) {
      console.warn('System still in maintenance mode')
    } finally {
      setTimeout(() => setChecking(false), 600)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Branding */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            LS
          </div>
          <span className="font-bold text-lg tracking-tight text-white">{platformName}</span>
        </div>
        <a 
          href="/login" 
          className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors"
        >
          Administrator Login &rarr;
        </a>
      </div>

      {/* Center Card */}
      <div className="w-full max-w-lg mx-auto bg-[#111827]/90 border border-slate-800/80 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Badge Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
          <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          <span>Scheduled Maintenance</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          We'll Be Right Back
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {platformName} is temporarily undergoing scheduled maintenance and system optimization. 
          Customer and licensing services are temporarily offline and will resume shortly.
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{checking ? 'Checking Status...' : 'Check Status'}</span>
          </button>
        </div>

        {/* Support info */}
        <div className="pt-6 border-t border-slate-800/80 text-xs text-slate-400">
          <p>
            Need urgent assistance? Contact us at{' '}
            <a 
              href={`mailto:${supportEmail}`} 
              className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              {supportEmail}
            </a>
          </p>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-xs text-slate-500 z-10">
        &copy; {new Date().getFullYear()} {platformName}. All rights reserved.
      </div>
    </div>
  )
}
