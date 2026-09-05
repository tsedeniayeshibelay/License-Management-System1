import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import CompanyLicenseManageModal from './CompanyLicenseManageModal'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

const TYPE_CONFIG = {
  SUBSCRIPTION: {
    label: 'Subscription',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    desc: 'Recurring time-bound license'
  },
  VOLUME: {
    label: 'Volume',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    desc: 'Multi-seat enterprise pooled quota'
  },
  PER_DEVICE: {
    label: 'Per Device',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    desc: 'Hardware-bound node-locked (strictly 1 device)'
  },
  PER_USER: {
    label: 'Per User',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    desc: 'Named user identity across allowed personal devices'
  },
  OPEN_SOURCE: {
    label: 'Open Source',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    desc: 'Community unconstrained deployment'
  }
}

const getSavedLicensingPrefs = () => {
  try {
    const saved = localStorage.getItem('company_licensing_prefs')
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to parse company_licensing_prefs', e)
  }
  return {
    defaultType: 'Subscription',
    defaultDuration: '1 Year',
    expirationRules: 'Strict (Instant Deactivation)',
    renewalPrefs: 'Manual',
    autoGenerate: false
  }
}

export default function CompanyLicenses({ licenses = [], products = [], fetchProducts }) {
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issuedOfflineModal, setIssuedOfflineModal] = useState(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [buyers, setBuyers] = useState([])
  const [selectedLicenseForManage, setSelectedLicenseForManage] = useState(null)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const [newLicense, setNewLicense] = useState({
    productId: '',
    buyerId: '',
    licenseType: 'SUBSCRIPTION',
    durationDays: 365,
    durationPreset: '1 Year',
    maxActivations: 1,
    autoGenerateOffline: false,
    expirationRules: 'Strict (Instant Deactivation)',
    renewalPrefs: 'Manual'
  })

  useEffect(() => {
    // Fetch potential buyers for the issue form
    const fetchBuyers = async () => {
      try {
        const res = await api.get('/users')
        if (res.data) setBuyers(res.data.filter(u => u.role === 'BULK_BUYER' || u.role === 'CUSTOMER'))
      } catch(e) {
        // Fallback: extract unique buyers from existing licenses
        const unique = new Map()
        licenses.forEach(l => {
          if (l.user) unique.set(l.user.id, l.user)
          else if (l.company) unique.set(l.company.id, l.company)
        })
        setBuyers(Array.from(unique.values()))
      }
    }
    fetchBuyers()
  }, [licenses])

  const handleOpenIssueModal = () => {
    const prefs = getSavedLicensingPrefs()
    
    const typeMap = {
      'Subscription': 'SUBSCRIPTION',
      'Volume': 'VOLUME',
      'Per Device': 'PER_DEVICE',
      'Per User': 'PER_USER',
      'Open Source': 'OPEN_SOURCE'
    }

    const durationMap = {
      '1 Month': 30,
      '1 Year': 365,
      'Lifetime': 36500
    }

    const mappedType = typeMap[prefs.defaultType] || 'SUBSCRIPTION'
    const mappedDuration = durationMap[prefs.defaultDuration] || 365

    setNewLicense({
      productId: products[0]?.id ? String(products[0].id) : '',
      buyerId: buyers[0]?.id ? String(buyers[0].id) : '',
      licenseType: mappedType,
      durationDays: mappedDuration,
      durationPreset: prefs.defaultDuration || '1 Year',
      maxActivations: mappedType === 'PER_DEVICE' ? 1 : 1,
      autoGenerateOffline: Boolean(prefs.autoGenerate),
      expirationRules: prefs.expirationRules || 'Strict (Instant Deactivation)',
      renewalPrefs: prefs.renewalPrefs || 'Manual'
    })
    setShowIssueModal(true)
  }

  const handleDurationPresetChange = (preset) => {
    if (preset === '1 Month') {
      setNewLicense(prev => ({ ...prev, durationPreset: preset, durationDays: 30 }))
    } else if (preset === '1 Year') {
      setNewLicense(prev => ({ ...prev, durationPreset: preset, durationDays: 365 }))
    } else if (preset === 'Lifetime') {
      setNewLicense(prev => ({ ...prev, durationPreset: preset, durationDays: 36500 }))
    } else {
      setNewLicense(prev => ({ ...prev, durationPreset: 'Custom' }))
    }
  }

  const handleTypeChange = (type) => {
    setNewLicense(prev => ({
      ...prev,
      licenseType: type,
      maxActivations: type === 'PER_DEVICE' ? 1 : (type === 'OPEN_SOURCE' ? 9999 : prev.maxActivations)
    }))
  }

  const handleDownloadQR = async (licenseId, licenseKey) => {
    try {
      const res = await api.get(`/licenses/${licenseId}/qrcode`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `license-${licenseKey || licenseId}-qr.png`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download QR', err)
      alert('Failed to download offline QR code.')
    }
  }

  const handleDownloadLicFile = (license, prodName, buyerName) => {
    try {
      const data = JSON.stringify({
        licenseKey: license.licenseKey,
        licenseId: license.id,
        productId: license.productId,
        productName: prodName || license.productName || license.product?.name || 'Software',
        licenseType: license.licenseType,
        maxActivations: license.maxActivations,
        totalSeats: license.totalSeats || license.maxActivations,
        issuedDate: license.issuedDate,
        expiryDate: license.expiryDate,
        buyer: buyerName || license.customerName || 'Assigned Buyer',
        offlineFallback: true,
        generatedAt: new Date().toISOString()
      }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${license.licenseKey || ('license-' + license.id)}.lic`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export license file', err)
      alert('Failed to generate license file.')
    }
  }

  const handleIssue = async (e) => {
    e.preventDefault()
    if (!newLicense.productId || !newLicense.buyerId) {
      alert("Please select both a product and a buyer.")
      return
    }
    setIssuing(true)
    try {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + (parseInt(newLicense.durationDays) || 365))
      
      const activationsCount = newLicense.licenseType === 'PER_DEVICE' 
        ? 1 
        : (parseInt(newLicense.maxActivations) || 1)

      const payload = {
        productId: parseInt(newLicense.productId),
        userId: parseInt(newLicense.buyerId),
        licenseType: newLicense.licenseType || 'SUBSCRIPTION',
        maxActivations: activationsCount,
        totalSeats: activationsCount,
        expiryDate: expDate.toISOString().split('T')[0]
      }

      const res = await api.post('/licenses', payload)
      const createdLicense = res.data
      
      const prod = products.find(p => String(p.id) === String(newLicense.productId))
      const buyer = buyers.find(b => String(b.id || b.username) === String(newLicense.buyerId))
      const prodName = prod ? `${prod.name} (${prod.version})` : 'Product'
      const buyerName = buyer ? (buyer.company || buyer.fullName || buyer.username) : 'Buyer'

      setShowIssueModal(false)

      if (newLicense.autoGenerateOffline) {
        // Show Offline Activation Package Ready dialog
        setIssuedOfflineModal({
          license: createdLicense,
          productName: prodName,
          buyerName: buyerName
        })
      } else {
        alert(`License generated successfully!\nLicense Key: ${createdLicense.licenseKey}`)
        if (fetchProducts) fetchProducts()
        window.location.reload()
      }
    } catch (err) {
      console.error("Failed to issue license", err)
      alert(err.response?.data?.message || 'Failed to issue license.')
    } finally {
      setIssuing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ACTIVE': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
      case 'EXPIRED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Expired</span>
      case 'REVOKED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Revoked</span>
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">{status || 'INACTIVE'}</span>
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Licenses</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and issue licenses with configured engine rules and offline capabilities.</p>
        </div>
        <button onClick={handleOpenIssueModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Issue New License
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Holder</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <p className="mb-2">No licenses found.</p>
                    <button onClick={handleOpenIssueModal} className="text-indigo-600 hover:text-indigo-500 font-medium">Issue your first license</button>
                  </td>
                </tr>
              ) : (
                licenses.map((license) => {
                  const holderName = license.customerName || license.user?.fullName || license.user?.username || license.company?.name || license.user?.company || 'Unknown'
                  const pName = license.productName || license.product?.name || (products.find(p => p.id === (license.productId || license.product?.id))?.name) || 'Unknown Product'
                  const exp = safeDate(license.expiryDate)
                  const typeConf = TYPE_CONFIG[license.licenseType] || TYPE_CONFIG.VOLUME
                  return (
                    <tr key={license.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{pName}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{holderName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${typeConf.badge}`}>
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(license.status)}</td>
                      <td className="px-6 py-4 text-slate-500">{exp ? exp.toLocaleDateString() : 'Never'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          title="Download Offline QR Code"
                          onClick={() => handleDownloadQR(license.id, license.licenseKey)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedLicenseForManage(license)
                            setIsManageOpen(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISSUE NEW LICENSE MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue New License</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pre-configured with company licensing policies.</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleIssue} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Product</label>
                <select required value={newLicense.productId} onChange={(e) => setNewLicense({...newLicense, productId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white">
                  <option value="">-- Choose a product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.version})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Assign to Buyer / Organization</label>
                <select required value={newLicense.buyerId} onChange={(e) => setNewLicense({...newLicense, buyerId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white">
                  <option value="">-- Choose a buyer --</option>
                  {buyers.map(b => <option key={b.id || b.username} value={b.id || b.username}>{b.company || b.fullName || b.username}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">License Type</label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Configured in Licensing Settings</span>
                </div>
                <select 
                  value={newLicense.licenseType} 
                  onChange={(e) => handleTypeChange(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium"
                >
                  <option value="SUBSCRIPTION">Subscription (Time-Bound Recurring)</option>
                  <option value="VOLUME">Volume (Multi-Seat Enterprise)</option>
                  <option value="PER_DEVICE">Per Device (Node-Locked strictly 1 machine)</option>
                  <option value="PER_USER">Per User (Named User Identity)</option>
                  <option value="OPEN_SOURCE">Open Source (Community Unrestricted)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Duration</label>
                  <select 
                    value={newLicense.durationPreset} 
                    onChange={(e) => handleDurationPresetChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white mb-2"
                  >
                    <option value="1 Month">1 Month (30 Days)</option>
                    <option value="1 Year">1 Year (365 Days)</option>
                    <option value="Lifetime">Lifetime (Perpetual)</option>
                    <option value="Custom">Custom Days</option>
                  </select>
                  {newLicense.durationPreset === 'Custom' && (
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      value={newLicense.durationDays} 
                      onChange={(e) => setNewLicense({...newLicense, durationDays: parseInt(e.target.value) || 1})} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white" 
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Max Activations / Seats</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    disabled={newLicense.licenseType === 'PER_DEVICE'}
                    value={newLicense.licenseType === 'PER_DEVICE' ? 1 : newLicense.maxActivations} 
                    onChange={(e) => setNewLicense({...newLicense, maxActivations: parseInt(e.target.value) || 1})} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white disabled:opacity-60" 
                  />
                  {newLicense.licenseType === 'PER_DEVICE' && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Node-locked: strictly 1 device per engine rule.</p>
                  )}
                </div>
              </div>

              {/* Policy Badges */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Expiration Handling:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{newLicense.expirationRules}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Renewal Policy:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{newLicense.renewalPrefs}</span>
                </div>
              </div>

              {/* Auto generate offline keys toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Auto-generate offline keys</label>
                    <p className="text-[11px] text-slate-500">Generates instant fallback QR token & .lic file for air-gapped devices.</p>
                  </div>
                  <div 
                    onClick={() => setNewLicense(prev => ({ ...prev, autoGenerateOffline: !prev.autoGenerateOffline }))} 
                    className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${newLicense.autoGenerateOffline ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newLicense.autoGenerateOffline ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={issuing} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                  {issuing ? 'Generating...' : 'Generate License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUED & OFFLINE ACTIVATION PACKAGE MODAL */}
      {issuedOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">License Issued Successfully</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Offline fallback package generated</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIssuedOfflineModal(null)
                  if (fetchProducts) fetchProducts()
                  window.location.reload()
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">License Key</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={issuedOfflineModal.license.licenseKey} 
                    className="flex-1 bg-slate-100 dark:bg-slate-950 font-mono text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold select-all" 
                  />
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard(issuedOfflineModal.license.licenseKey)}
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold transition-colors flex items-center"
                  >
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block">Product:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedOfflineModal.productName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Buyer:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedOfflineModal.buyerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">License Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedOfflineModal.license.licenseType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Expiry Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedOfflineModal.license.expiryDate || 'Perpetual'}</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Offline Fallback Packages</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You can provide the offline QR Code or downloadable file for client devices that cannot access the internet.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button 
                    type="button" 
                    onClick={() => handleDownloadQR(issuedOfflineModal.license.id, issuedOfflineModal.license.licenseKey)} 
                    className="flex-1 min-w-[140px] px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download QR Code
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDownloadLicFile(issuedOfflineModal.license, issuedOfflineModal.productName, issuedOfflineModal.buyerName)} 
                    className="flex-1 min-w-[140px] px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Download .lic File
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setIssuedOfflineModal(null)
                    if (fetchProducts) fetchProducts()
                    window.location.reload()
                  }} 
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Done & View in Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CompanyLicenseManageModal
        license={selectedLicenseForManage}
        isOpen={isManageOpen}
        onClose={() => {
          setIsManageOpen(false)
          setSelectedLicenseForManage(null)
        }}
        onSuccess={() => {
          setIsManageOpen(false)
          setSelectedLicenseForManage(null)
          if (fetchProducts) fetchProducts()
          window.location.reload()
        }}
      />
    </div>
  )
}
