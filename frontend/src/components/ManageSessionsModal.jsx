import React, { useState } from 'react'
import api from '../services/api'

function ManageSessionsModal({ isOpen, onClose, devices, onRefreshDevices }) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const currentDeviceId = localStorage.getItem('app_device_id')

  const handleRevokeDevice = async (deviceId) => {
    try {
      setLoading(true)
      setErrorMsg('')
      await api.delete(`/users/profile/devices/${deviceId}`)
      setSuccessMsg('Session revoked successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
      if (onRefreshDevices) await onRefreshDevices()
    } catch (err) {
      console.error('Failed to revoke session', err)
      setErrorMsg(err.response?.data?.message || 'Failed to revoke session.')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAllOthers = async () => {
    if (!window.confirm('Are you sure you want to sign out of all other devices and sessions?')) {
      return
    }
    try {
      setLoading(true)
      setErrorMsg('')
      await api.post(`/users/profile/devices/revoke-others?currentDeviceId=${encodeURIComponent(currentDeviceId || '')}`)
      setSuccessMsg('Signed out of all other sessions successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
      if (onRefreshDevices) await onRefreshDevices()
    } catch (err) {
      console.error('Failed to revoke other sessions', err)
      setErrorMsg(err.response?.data?.message || 'Failed to sign out of other sessions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#0f52ba]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Sessions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage devices currently logged into your company account.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {successMsg}
          </div>
        )}

        {/* Device List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {(!devices || devices.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No active sessions recorded.
            </div>
          ) : (
            devices.map((device, index) => {
              const isCurrent = device.deviceIdentifier === currentDeviceId || (!currentDeviceId && index === 0)
              return (
                <div 
                  key={device.id || index}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    isCurrent 
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40' 
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCurrent 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {device.deviceName || 'Recognized Browser'}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        IP: {device.ipAddress || '127.0.0.1'} • Last active: {device.lastLoginAt ? new Date(device.lastLoginAt).toLocaleString() : 'Recently'}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeDevice(device.id)}
                      disabled={loading}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2.5 py-1 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleRevokeAllOthers}
            disabled={loading || !devices || devices.length <= 1}
            className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
          >
            Sign Out All Other Sessions
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManageSessionsModal
