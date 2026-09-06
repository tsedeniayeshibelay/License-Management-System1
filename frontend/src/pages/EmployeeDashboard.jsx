import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function EmployeeDashboard({ user, licenses = [], devices = [], onRefresh }) {
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [downloadingPid, setDownloadingPid] = useState(null)
  
  // Offline activation state
  const [offlineFile, setOfflineFile] = useState(null)
  const [offlineLoading, setOfflineLoading] = useState(false)

  // Activation method state
  const [activationMethod, setActivationMethod] = useState('desktop') // 'desktop' | 'offline'

  // --- Dashboard Preferences (loaded from profile or local storage) ---
  const [preferences, setPreferences] = useState(() => {
    try {
      if (user?.preferences) {
        const parsed = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences
        if (parsed?.dashboardPrefs) return parsed.dashboardPrefs
      }
      const local = localStorage.getItem('customer_preferences')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed?.dashboardPrefs) return parsed.dashboardPrefs
      }
    } catch (e) {}
    return {
      landingPage: 'Dashboard',
      dataDensity: 'Comfortable (Default)',
      showQuickActions: true
    }
  })

  useEffect(() => {
    const handlePrefsChange = (e) => {
      const full = e?.detail
      const newPrefs = full?.dashboardPrefs || (full?.landingPage ? full : null)
      if (newPrefs) {
        setPreferences(newPrefs)
      } else {
        try {
          const local = localStorage.getItem('customer_preferences')
          if (local) {
            const parsed = JSON.parse(local)
            if (parsed?.dashboardPrefs) setPreferences(parsed.dashboardPrefs)
          }
        } catch (err) {}
      }
    }
    window.addEventListener('preferences-changed', handlePrefsChange)
    window.addEventListener('storage', handlePrefsChange)
    return () => {
      window.removeEventListener('preferences-changed', handlePrefsChange)
      window.removeEventListener('storage', handlePrefsChange)
    }
  }, [])

  // Dynamic Density Styles
  const isCompact = (preferences?.dataDensity || '').toLowerCase().includes('compact')
  const thPad = isCompact ? 'py-2 px-3 text-[10px]' : 'p-4 text-[11px]'
  const tdPad = isCompact ? 'py-2 px-3 text-xs' : 'p-4 text-sm'
  const badgePad = isCompact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
  const btnPad = isCompact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'

  // Dynamic Quick Actions
  const showQuickActions = preferences?.showQuickActions !== false
  const actionContainerClass = showQuickActions 
    ? "transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto" 
    : "opacity-100 pointer-events-auto"

  const [downloadedProducts, setDownloadedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(`lockstrata_downloaded_${user?.id || 'employee'}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const companyName = user?.companyEntity?.name || user?.company || 'Your Organization'

  const handleDownload = async (productId) => {
    try {
      setDownloadingPid(productId)
      const res = await api.get(`/releases/product/${productId}/latest`)
      const rel = res.data
      if (!rel) {
        alert("No software release is currently available for this product. Please contact your company administrator.")
        return
      }

      if (rel.distributionMethod === 'EXTERNAL') {
        window.open(rel.downloadUrl, '_blank')
      } else {
        const fileRes = await api.get(`/releases/${rel.id}/download?bundle=true`, { responseType: 'blob' })
        const rawData = fileRes.data instanceof Blob ? fileRes.data : new Blob([fileRes.data]);

        let isRealZip = false;
        try {
          const slice = await rawData.slice(0, 4).arrayBuffer();
          const view = new Uint8Array(slice);
          if (view[0] === 0x50 && view[1] === 0x4B) {
            isRealZip = true;
          }
        } catch (e) {
          isRealZip = false;
        }

        let filename = 'software-package.zip';
        const disposition = fileRes.headers?.['content-disposition'];
        if (disposition) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match && match[1]) filename = match[1];
        }

        if (isRealZip) {
          if (!filename.toLowerCase().endsWith('.zip')) {
            filename = (rel.originalFilename ? rel.originalFilename.replace(/\.[^/.]+$/, "") : 'software-package') + '-setup.zip';
          }
        } else {
          filename = rel.originalFilename || 'LockStrataClient.exe';
          if (filename.toLowerCase().endsWith('.zip')) {
            filename = filename.replace(/\.zip$/i, ".exe");
          }
        }

        const blob = new Blob([rawData], { type: isRealZip ? 'application/zip' : 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }

      setDownloadedProducts(prev => {
        const updated = { ...prev, [productId]: true }
        try {
          localStorage.setItem(`lockstrata_downloaded_${user?.id || 'employee'}`, JSON.stringify(updated))
        } catch {}
        return updated
      })
    } catch (err) {
      alert("Could not download software: " + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingPid(null)
    }
  }

  const handleOfflineUpload = async (e) => {
    e.preventDefault()
    if (!offlineFile || !selectedLicense) return

    try {
      setOfflineLoading(true)
      const formData = new FormData()
      formData.append('file', offlineFile)
      formData.append('licenseId', selectedLicense.id)

      const response = await api.post('/activations/offline/upload', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'license.lic')
      document.body.appendChild(link)
      link.click()
      link.remove()
      alert("✅ Offline license file (.lic) generated and downloaded successfully!")
      setOfflineFile(null)
      setShowActivationModal(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      alert("Failed to process offline file upload.")
    } finally {
      setOfflineLoading(false)
    }
  }

  const safeLicenses = Array.isArray(licenses) ? licenses : []
  const safeDevices = Array.isArray(devices) ? devices : []
  const totalAssigned = safeLicenses.length
  const totalActivated = safeDevices.filter(d => d && d.isActive).length

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 text-slate-700 dark:text-slate-300 animate-in fade-in duration-300">
      
      {/* 1. EMPLOYEE WORKSPACE HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>{companyName} • Employee Workspace</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {user?.loginCount === 1 ? 'Welcome' : 'Welcome back'}, {user?.fullName || user?.username || 'Employee'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Access and download your company-assigned software licenses, manage your registered devices, and activate your workstation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs">
              <span className="text-slate-500 block">Organization</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px] block">{companyName}</span>
            </div>
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs">
              <span className="text-slate-500 block">Assigned Software</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{totalAssigned} Tool{totalAssigned !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Software</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalAssigned}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bound Devices</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalActivated}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned By</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">{companyName}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</p>
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Active Employee
            </h3>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNED SOFTWARE SECTION */}
      <div id="my-licenses" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Assigned Software</h2>
            <p className="text-xs text-slate-500 mt-0.5">Download client installers and manage your workstation device seat.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                <th className={`${thPad} pl-6`}>Software Application</th>
                <th className={thPad}>Assigned Organization</th>
                <th className={thPad}>Seat Activations</th>
                <th className={thPad}>Device Status</th>
                <th className={thPad}>Validity</th>
                <th className={`${thPad} pr-6 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {safeLicenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-base">No Software Assigned Yet</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Your company administrator has not yet assigned a license seat to your account. Please reach out to your IT department.
                    </p>
                  </td>
                </tr>
              ) : (
                safeLicenses.map(lic => {
                  const isActivated = (lic.currentActivations || 0) > 0
                  const expiryStr = lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : 'Perpetual'
                  
                  return (
                    <tr key={lic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className={`${tdPad} pl-6`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 font-black text-xs">
                            {(lic.productName || 'SW').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {lic.productName || `Product #${lic.productId}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdPad} font-medium text-slate-600 dark:text-slate-300`}>
                        {lic.assignedByCompany || companyName}
                      </td>
                      <td className={tdPad}>
                        <span className="font-bold text-slate-900 dark:text-white">{lic.currentActivations || 0}</span> / 1 device
                      </td>
                      <td className={tdPad}>
                        {isActivated ? (
                          <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                            Activated
                          </span>
                        ) : (
                          <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                            Assigned (Ready to Activate)
                          </span>
                        )}
                      </td>
                      <td className={`${tdPad} text-slate-500`}>
                        {expiryStr}
                      </td>
                      <td className={`${tdPad} pr-6 text-right`}>
                        <div className={`inline-flex items-center justify-end space-x-2 ${actionContainerClass}`}>
                          {/* 1-Click Installer Download Button */}
                          {downloadedProducts[lic.productId] ? (
                            <button
                              disabled
                              className={`inline-flex items-center ${btnPad} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold rounded-lg shadow-sm cursor-default opacity-90`}
                              title="Software installer has already been downloaded."
                            >
                              <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                              Downloaded
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDownload(lic.productId)}
                              disabled={downloadingPid === lic.productId}
                              className={`inline-flex items-center ${btnPad} bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer`}
                              title="Download application installer"
                            >
                              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                              {downloadingPid === lic.productId ? 'Downloading...' : 'Download'}
                            </button>
                          )}

                          {/* Activate / Guide Button */}
                          <button
                            onClick={() => { setSelectedLicense(lic); setShowActivationModal(true); setActivationMethod('desktop'); }}
                            className={`inline-flex items-center ${btnPad} bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer`}
                          >
                            {isActivated ? 'Device Info' : 'Activate Seat'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. REGISTERED DEVICES SECTION */}
      <div id="activated-devices" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Bound Devices</h2>
            <p className="text-xs text-slate-500 mt-0.5">Hardware machines actively bound to your company software seats.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className={`${thPad} pl-6`}>Device Name</th>
                <th className={thPad}>Operating System</th>
                <th className={thPad}>Machine Fingerprint</th>
                <th className={thPad}>Last Active</th>
                <th className={`${thPad} pr-6 text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {safeDevices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 text-xs">
                    No devices registered yet. Download the desktop software and log in on your workstation to register this device.
                  </td>
                </tr>
              ) : (
                safeDevices.map(dev => (
                  <tr key={`${dev.id}-${dev.licenseId || '0'}`} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className={`${tdPad} pl-6 font-bold text-slate-900 dark:text-white flex items-center space-x-2`}>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <span>{dev.deviceName || 'Personal Workstation'}</span>
                    </td>
                    <td className={`${tdPad} text-slate-600 dark:text-slate-300`}>
                      {dev.os || 'Windows'}
                    </td>
                    <td className={`${tdPad} font-mono text-slate-500`}>
                      {dev.machineId || 'N/A'}
                    </td>
                    <td className={`${tdPad} text-slate-500`}>
                      {dev.lastSeen ? new Date(dev.lastSeen).toLocaleString() : 'Recently'}
                    </td>
                    <td className={`${tdPad} pr-6 text-right`}>
                      <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        Active Device
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ACTIVATION MODAL */}
      {showActivationModal && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Software Activation Guide</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedLicense.productName || 'Assigned Software'}
                </h3>
              </div>
              <button onClick={() => setShowActivationModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Method Tabs */}
            <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setActivationMethod('desktop')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activationMethod === 'desktop' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Desktop App
              </button>
              <button
                onClick={() => setActivationMethod('offline')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activationMethod === 'offline' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Offline AirGap
              </button>
            </div>

            {/* TAB CONTENT */}
            {activationMethod === 'desktop' && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                  <strong>💡 Easiest Method:</strong> Your license is assigned to your LockStrata account. Simply launch the installed software and sign in.
                </div>
                <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center mr-2.5 shrink-0 text-[11px]">1</span>
                    <span>Download and run the software installer using the <strong>Download</strong> button.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center mr-2.5 shrink-0 text-[11px]">2</span>
                    <span>Launch the application on this PC and sign in using your company email credentials (<strong>{user?.email}</strong>).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center mr-2.5 shrink-0 text-[11px]">3</span>
                    <span>Your workstation binds automatically! If the application displays a QR code on launch, scan that QR directly with your camera or LockStrata companion.</span>
                  </li>
                </ol>

                <div className="pt-3">
                  <button
                    onClick={() => handleDownload(selectedLicense.productId)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Installer Now
                  </button>
                </div>
              </div>
            )}

            {activationMethod === 'offline' && (
              <form onSubmit={handleOfflineUpload} className="space-y-4 py-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  If your workstation is isolated from the internet (AirGap), generate a <code className="text-blue-500">request.json</code> file on that PC and upload it here to receive your encrypted <code className="text-blue-500">license.lic</code> file.
                </p>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    required
                    onChange={e => setOfflineFile(e.target.files[0])}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!offlineFile || offlineLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  {offlineLoading ? 'Generating .lic...' : 'Upload & Download license.lic'}
                </button>
              </form>
            )}

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setShowActivationModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
