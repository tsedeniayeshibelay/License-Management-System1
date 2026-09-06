import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { downloadInvoice } from '../utils/invoiceGenerator'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  let d;
  if (Array.isArray(dateStr)) {
    d = new Date(dateStr[0], dateStr[1] - 1, dateStr[2], dateStr[3] || 0, dateStr[4] || 0, dateStr[5] || 0);
  } else {
    d = new Date(dateStr);
  }
  return isNaN(d.getTime()) ? null : d;
};

function CustomerDashboard({ user, stats, licenses, devices }) {
  const navigate = useNavigate()

  // Helper to map landing preference to dashboard internal tab
  const tabFromLanding = (landing) => {
    const l = (landing || '').toLowerCase()
    if (l.includes('license')) return 'licenses'
    if (l.includes('device')) return 'devices'
    if (l.includes('order') || l.includes('invoice')) return 'orders'
    return 'overview'
  }

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

  // Track if user explicitly chose a tab so we don't unexpectedly bounce them back
  const hasUserManuallySwitchedTab = useRef(false)

  // Determine initial activeTab based on Default Landing Page preference
  const getInitialTab = () => {
    try {
      let prefs = null
      if (user?.preferences) {
        const parsed = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences
        prefs = parsed?.dashboardPrefs
      }
      if (!prefs) {
        const local = localStorage.getItem('customer_preferences')
        if (local) prefs = JSON.parse(local)?.dashboardPrefs
      }
      return tabFromLanding(prefs?.landingPage)
    } catch (e) {}
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Synchronize preferences if user updates or when saved in Settings
  useEffect(() => {
    const handlePrefsChange = (e) => {
      const full = e?.detail
      const newPrefs = full?.dashboardPrefs || (full?.landingPage ? full : null)
      if (newPrefs) {
        setPreferences(newPrefs)
        if (newPrefs.landingPage) {
          hasUserManuallySwitchedTab.current = false
          setActiveTab(tabFromLanding(newPrefs.landingPage))
        }
      } else {
        try {
          const local = localStorage.getItem('customer_preferences')
          if (local) {
            const parsed = JSON.parse(local)
            if (parsed?.dashboardPrefs) {
              setPreferences(parsed.dashboardPrefs)
              if (parsed.dashboardPrefs.landingPage) {
                hasUserManuallySwitchedTab.current = false
                setActiveTab(tabFromLanding(parsed.dashboardPrefs.landingPage))
              }
            }
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

  useEffect(() => {
    if (user?.preferences) {
      try {
        const parsed = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences
        if (parsed?.dashboardPrefs) {
          setPreferences(parsed.dashboardPrefs)
          if (!hasUserManuallySwitchedTab.current && parsed.dashboardPrefs.landingPage) {
            setActiveTab(tabFromLanding(parsed.dashboardPrefs.landingPage))
          }
        }
      } catch (e) {}
    }
  }, [user?.preferences])

  // Listen to sidebar tab navigation if triggered from Dashboard.jsx
  useEffect(() => {
    const handleSidebarTab = (e) => {
      if (e?.detail) {
        hasUserManuallySwitchedTab.current = true
        setActiveTab(e.detail)
      }
    }
    window.addEventListener('customer-tab-change', handleSidebarTab)
    return () => window.removeEventListener('customer-tab-change', handleSidebarTab)
  }, [])

  // Dynamic Density Styles
  const isCompact = (preferences?.dataDensity || '').toLowerCase().includes('compact')
  const thPad = isCompact ? 'px-3.5 py-1.5 text-[10px]' : 'px-6 py-3.5 text-xs'
  const tdPad = isCompact ? 'px-3.5 py-1.5 text-xs' : 'px-6 py-4 text-sm'
  const badgePad = isCompact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
  const btnPad = isCompact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'

  // Dynamic Quick Actions
  const showQuickActions = preferences?.showQuickActions !== false
  const actionContainerClass = showQuickActions 
    ? "transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto" 
    : "opacity-100 pointer-events-auto"
  const [unbindRequests, setUnbindRequests] = useState([])
  const [showUnbindModal, setShowUnbindModal] = useState(false)
  const [unbindReason, setUnbindReason] = useState('')
  const [selectedDevice, setSelectedDevice] = useState(null)

  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [latestRelease, setLatestRelease] = useState(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [downloadedProducts, setDownloadedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(`lockstrata_downloaded_${user?.id || 'guest'}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [offlineRequestFile, setOfflineRequestFile] = useState(null)

  const [usageLogs, setUsageLogs] = useState([])
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null)
  const fetchUnbindRequests = async () => {
    try {
      const res = await api.get('/unbind-requests/my-requests')
      setUnbindRequests(Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []))
    } catch (err) {
      console.error("Failed to fetch unbind requests", err)
    }
  }

  const fetchUsageLogs = async () => {
    try {
      const res = await api.get('/usage-logs/my-logs')
      setUsageLogs(Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []))
    } catch (err) {
      console.error("Failed to fetch usage logs", err)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/orders/my-orders'),
        api.get('/products/public').catch(() => ({ data: [] }))
      ])
      const productList = Array.isArray(productsRes.data) ? productsRes.data : (Array.isArray(productsRes.data?.content) ? productsRes.data.content : [])
      const prodMap = {}
      productList.forEach(p => { prodMap[p.id] = p.name })

      const rawOrders = Array.isArray(ordersRes.data) ? ordersRes.data : []
      const enrichedOrders = rawOrders.map(o => ({
        ...o,
        productName: o.productName || prodMap[o.productId] || (licenses?.find(l => l.id === o.licenseId || l.productId === o.productId)?.productName) || `Product #${o.productId}`
      }))
      setOrders(enrichedOrders)
    } catch (err) {
      console.error("Failed to fetch customer orders", err)
    } finally {
      setLoadingOrders(false)
    }
  }

  const orderMapByLicenseId = React.useMemo(() => {
    const map = {}
    orders.forEach(o => {
      if (o.licenseId) {
        map[o.licenseId] = o
      }
    })
    return map
  }, [orders])

  const filteredOrders = React.useMemo(() => {
    if (!orderSearch.trim()) return orders
    const q = orderSearch.toLowerCase()
    return orders.filter(o => 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.productName && o.productName.toLowerCase().includes(q)) ||
      (o.status && o.status.toLowerCase().includes(q)) ||
      (o.id && String(o.id).includes(q))
    )
  }, [orders, orderSearch])

  const handleDownloadInvoice = async (orderOrLicense) => {
    try {
      let targetOrder = orderOrLicense
      // If a license object was passed or order needs fetching
      if (!targetOrder.orderNumber && targetOrder.id) {
        targetOrder = orderMapByLicenseId[targetOrder.id]
        if (!targetOrder) {
          setDownloadingInvoiceId(orderOrLicense.id)
          const res = await api.get(`/orders/license/${orderOrLicense.id}`)
          targetOrder = res.data
        }
      }
      if (!targetOrder) {
        alert("Order invoice not found for this license.")
        return
      }

      setDownloadingInvoiceId(targetOrder.id)
      downloadInvoice(targetOrder, user)
    } catch (err) {
      console.error("Failed to download invoice", err)
      if (err.response?.status === 403) {
        alert("Access denied: You can only view or download invoices for your own orders.")
      } else {
        alert(err.response?.data?.message || "Failed to download invoice.")
      }
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [licenses])

  useEffect(() => {
    fetchUnbindRequests()
    fetchUsageLogs()
  }, [])

  useEffect(() => {
    if (showLicenseModal && selectedLicense) {
      const fetchRelease = async () => {
        try {
          const res = await api.get(`/releases/product/${selectedLicense.productId}/latest`)
          setLatestRelease(res.data)
        } catch (err) {
          console.error("Failed to fetch latest release", err)
          setLatestRelease(null)
        }
      }
      
      fetchRelease()
    } else {
      setLatestRelease(null)
    }
  }, [showLicenseModal, selectedLicense])

  const handleDownloadSoftware = async (productId) => {
    try {
      const res = await api.get(`/releases/product/${productId}/latest`)
      const rel = res.data
      if (!rel) {
        alert("No software installer has been uploaded for this product yet. Please contact your company administrator.")
        return
      }
      if (rel.distributionMethod === 'EXTERNAL') {
        window.open(rel.downloadUrl, '_blank')
      } else {
        const fileRes = await api.get(`/releases/${rel.id}/download`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([fileRes.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', rel.originalFilename || 'software-installer.exe')
        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      setDownloadedProducts(prev => {
        const updated = { ...prev, [productId]: true }
        try {
          localStorage.setItem(`lockstrata_downloaded_${user?.id || 'guest'}`, JSON.stringify(updated))
        } catch {}
        return updated
      })
    } catch (err) {
      alert("Could not download software: " + (err.response?.data?.message || err.message))
    }
  }

  const handleRequestUnbind = async (device) => {
    const isPending = unbindRequests.some(r => (r.deviceId == device.id || r.device?.id == device.id) && r.status === 'PENDING')
    if (isPending) return

    if (!window.confirm(`Request unbinding for ${device.deviceName || 'this device'}? An unbind request will be sent to the administrator for approval.`)) {
      return
    }

    // 1. Optimistically change button to 'Pending' immediately
    const tempId = 'temp-' + Date.now()
    const optimisticReq = {
      id: tempId,
      deviceId: device.id,
      device: device,
      deviceName: device.deviceName || device.machineId,
      licenseId: device.licenseId || null,
      reason: 'Hardware unbind requested by user',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    setUnbindRequests(prev => [optimisticReq, ...prev.filter(r => r.deviceId != device.id)])

    try {
      const res = await api.post(`/devices/${device.id}/unbind`, {
        reason: 'Hardware unbind requested by user',
        licenseId: device.licenseId || null
      })
      
      // Update with server response
      setUnbindRequests(prev => [res.data, ...prev.filter(r => r.id !== tempId && r.deviceId != device.id)])
      fetchUnbindRequests()
    } catch (err) {
      console.error("Failed to submit unbind request", err)
      fetchUnbindRequests()
      alert(err.response?.data?.message || "Failed to submit unbind request")
    }
  }

  const handleUnbindSubmit = async () => {
    if (!selectedDevice) return
    const device = selectedDevice
    const reason = unbindReason.trim() || 'Hardware replacement / unbind requested by user'

    setShowUnbindModal(false)
    setUnbindReason('')
    setSelectedDevice(null)

    const tempId = 'temp-' + Date.now()
    setUnbindRequests(prev => [
      {
        id: tempId,
        deviceId: device.id,
        device: device,
        deviceName: device.deviceName || device.machineId,
        licenseId: device.licenseId || null,
        reason: reason,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      ...prev.filter(r => r.deviceId != device.id)
    ])

    try {
      const res = await api.post(`/devices/${device.id}/unbind`, {
        reason: reason,
        licenseId: device.licenseId || null
      })
      setUnbindRequests(prev => [res.data, ...prev.filter(r => r.id !== tempId && r.deviceId != device.id)])
      fetchUnbindRequests()
    } catch (err) {
      console.error("Failed to submit unbind request", err)
      fetchUnbindRequests()
      alert(err.response?.data?.message || "Failed to submit unbind request")
    }
  }

  const handleUploadRequest = async (e) => {
    e.preventDefault()
    if (!offlineRequestFile || !selectedLicense) return

    try {
      const formData = new FormData()
      formData.append('file', offlineRequestFile)
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
      alert("Offline license file generated and downloaded!")
      setOfflineRequestFile(null)
    } catch (err) {
      console.error("Offline activation failed", err)
      if (err.response?.data?.message) {
          alert(`Failed: ${err.response.data.message}`)
      } else if (err.response?.data && err.response.data instanceof Blob) {
          const text = await err.response.data.text()
          try {
             const json = JSON.parse(text)
             alert(`Failed: ${json.message || json.error}`)
          } catch(e) {
             alert("Failed to process offline file upload.")
          }
      } else {
          alert("Failed to process offline file upload.")
      }
    }
  }

  const handleCopyLicense = () => {
    if (selectedLicense?.licenseKey) {
      navigator.clipboard.writeText(selectedLicense.licenseKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  // --- Combined Activity (usageLogs + activated devices + licenses) ---
  const allActivities = React.useMemo(() => {
    const list = [...(Array.isArray(usageLogs) ? usageLogs : [])];
    const seenKeys = new Set(list.map(l => `${l.deviceId}-${l.licenseId}`));
    
    // Add activation events from devices
    (Array.isArray(devices) ? devices : []).forEach(d => {
      const key = `${d.id}-${d.licenseId}`;
      if (!seenKeys.has(key)) {
        list.push({
          id: `dev-${d.id}`,
          featuresUsed: `Device Activated (${d.deviceName || 'Hardware'})`,
          durationMinutes: 0,
          createdAt: d.activatedAt || d.lastSeen || d.createdAt || new Date().toISOString(),
          ipAddress: d.ipAddress || null,
          activationMethod: 'Online'
        });
        seenKeys.add(key);
      }
    });

    // If still empty, add active license creation/issue events
    if (list.length === 0 && Array.isArray(licenses) && licenses.length > 0) {
      licenses.filter(l => l.status === 'ACTIVE').forEach(l => {
        list.push({
          id: `lic-${l.id}`,
          featuresUsed: `License Active (${l.productName || 'Software'})`,
          durationMinutes: 0,
          createdAt: l.issuedDate || l.createdAt || new Date().toISOString(),
          ipAddress: null,
          activationMethod: 'Online'
        });
      });
    }

    // Sort descending by timestamp
    return list.sort((a, b) => {
      const da = safeDate(a.createdAt || a.sessionStart);
      const db = safeDate(b.createdAt || b.sessionStart);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
  }, [usageLogs, devices, licenses]);

  // --- Recharts Data Prep ---
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const count = allActivities.filter(log => {
        const logDate = safeDate(log.createdAt || log.sessionStart);
        return logDate && logDate.toDateString() === d.toDateString();
      }).length;
      data.push({ date: dateStr, events: count });
    }
    return data;
  }
  const activityData = getLast7DaysData();

  const getStatusDistribution = () => {
    if (!licenses || licenses.length === 0) return [];
    const active = licenses.filter(l => l.status === 'ACTIVE').length;
    const expired = licenses.filter(l => l.status === 'EXPIRED').length;
    const inactive = licenses.filter(l => l.status === 'INACTIVE' || l.status === 'NOT_ACTIVATED').length;
    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Expired', value: expired, color: '#ef4444' },
      { name: 'Inactive', value: inactive, color: '#64748b' }
    ].filter(d => d.value > 0);
  }
  const statusData = getStatusDistribution();
  const complianceScore = stats.total > 0 ? Math.round(((stats.total - stats.expired) / stats.total) * 100) : 100;
  let complianceStatus = "Excellent";
  let complianceColor = "text-emerald-600 dark:text-emerald-400";
  let complianceBar = "bg-emerald-500";
  if (complianceScore < 100 && complianceScore >= 80) {
    complianceStatus = "Warning";
    complianceColor = "text-amber-600 dark:text-amber-400";
    complianceBar = "bg-amber-500";
  } else if (complianceScore < 80) {
    complianceStatus = "Action Required";
    complianceColor = "text-red-600 dark:text-red-400";
    complianceBar = "bg-red-500";
  }

  // Define Recharts theme styles based on document body class (a bit hacky but works, or just use a generic style)
  // Recharts tooltip styling for light/dark
  const tooltipStyle = {
    backgroundColor: 'var(--tw-prose-body, #fff)', // Will rely on Tailwind dark class applied to body
    borderColor: '#e2e8f0', // slate-200
    borderRadius: '0.5rem',
    color: '#0f172a',
    ...(document.documentElement.classList.contains('dark') ? {
      backgroundColor: '#0f1523',
      borderColor: '#1e293b',
      color: '#f8fafc'
    } : {})
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 text-slate-700 dark:text-slate-300">
      
      {/* WELCOME HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Good morning, {user.username}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-2xl">
            Manage your software licenses, activations, and devices from one unified enterprise control center.
          </p>
        </div>
        <div className="flex space-x-3">
          {stats.expiring > 0 && (
            <div className="flex items-center space-x-2 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/20 px-3 py-1.5 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{stats.expiring} Expiring Soon</span>
            </div>
          )}
          {unbindRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <div className="flex items-center space-x-2 bg-cyan-100 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-500/20 px-3 py-1.5 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">{unbindRequests.filter(r => r.status === 'PENDING').length} Pending Unbinds</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      {activeTab !== 'overview' && (
        <div className="flex items-center -mt-4 mb-2 animate-in slide-in-from-left-4 duration-300">
          <button onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('overview'); }} className="px-4 py-2 bg-slate-100 dark:bg-[#131a2b] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e293b] rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center border border-slate-200 dark:border-slate-800">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard Overview
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        
        <div onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('licenses'); }} className={`bg-white dark:bg-[#0f1523] border ${activeTab === 'licenses' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex items-center shadow-md dark:shadow-lg relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-5 border border-blue-200 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div className="z-10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Licenses</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stats.total}</p>
          </div>
        </div>

        <div onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('licenses'); }} className={`bg-white dark:bg-[#0f1523] border ${activeTab === 'licenses' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex items-center shadow-md dark:shadow-lg relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-5 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div className="z-10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Active</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{stats.active}</p>
          </div>
        </div>

        <div onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('licenses'); }} className={`bg-white dark:bg-[#0f1523] border ${activeTab === 'licenses' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex items-center shadow-md dark:shadow-lg relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:bg-amber-500/20 mr-5 border border-amber-200 dark:border-amber-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div className="z-10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Expiring Soon</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{stats.expiring}</p>
          </div>
        </div>

        <div onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('devices'); }} className={`bg-white dark:bg-[#0f1523] border ${activeTab === 'devices' ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex items-center shadow-md dark:shadow-lg relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mr-5 border border-cyan-200 dark:border-cyan-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <div className="z-10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Activated Devices</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{devices.length}</p>
          </div>
        </div>

        <div onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('orders'); }} className={`bg-white dark:bg-[#0f1523] border ${activeTab === 'orders' ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-6 flex items-center shadow-md dark:shadow-lg relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4zm2 8h8v2H8v-2zm0 4h8v2H8v-2z"></path></svg>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400 mr-5 border border-violet-200 dark:border-violet-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div className="z-10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Orders & Invoices</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* ANALYTICS & COMPLIANCE ROW */}
      {(activeTab === 'overview' || activeTab === 'analytics') && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg flex flex-col">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">License Activity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Events over the last 7 days</p>
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            {allActivities.length === 0 ? (
               <div className="h-full flex items-center justify-center flex-col text-slate-400 dark:text-slate-500">
                 <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                 <p className="text-sm">No activity data available.</p>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#0ea5e9' }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Compliance & Distribution */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">License Compliance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Current account standing</p>
            
            <div className="flex items-end justify-between mb-2">
              <p className={`text-xl font-bold ${complianceColor}`}>{complianceStatus}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{complianceScore}% <span className="text-slate-500 font-normal">Active</span></p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden">
              <div className={`h-2.5 rounded-full ${complianceBar}`} style={{ width: `${complianceScore}%` }}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.active}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Expired</p>
                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">{stats.expired}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white self-start w-full">License Status</h3>
            <div className="h-40 w-full mt-4 relative">
              {statusData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No licenses</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* EXPIRING WARNING ALERT */}
      {stats.expiring > 0 && activeTab === 'overview' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <h4 className="text-amber-700 dark:text-amber-400 font-bold text-sm">Action Recommended</h4>
              <p className="text-amber-600 dark:text-amber-500/80 text-xs mt-0.5">You have {stats.expiring} license(s) expiring within the next 30 days.</p>
            </div>
          </div>
          <button onClick={() => document.getElementById('my-licenses')?.scrollIntoView({behavior: 'smooth'})} className="px-4 py-2 bg-amber-200/50 dark:bg-amber-500/20 hover:bg-amber-300/50 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 text-sm font-bold rounded-lg transition-colors">
            View Licenses
          </button>
        </div>
      )}

      {/* MY LICENSES TABLE */}
      {(activeTab === 'overview' || activeTab === 'licenses') && (
      <div id="my-licenses" className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-lg overflow-hidden scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Licenses</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and view details for all purchased products.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#131a2b] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className={thPad}>Product</th>
                <th className={thPad}>Type</th>
                <th className={thPad}>Activations</th>
                <th className={thPad}>Status</th>
                <th className={thPad}>Expiration</th>
                <th className={`${thPad} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    <p className="text-slate-900 dark:text-white font-medium mb-1">You don't have any licenses yet.</p>
                    <p className="text-slate-500 text-sm">Browse the catalog to find software licenses, or ask your company admin to assign one.</p>
                  </td>
                </tr>
              ) : licenses.map(license => {
                const expiryStr = license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : 'N/A'
                const isAssigned = license.isAssigned === true
                const isActivated = (license.currentActivations || 0) > 0
                
                let statusPill
                if (license.status === 'EXPIRED') {
                  statusPill = <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50`}>Expired</span>
                } else if (isAssigned) {
                  if (isActivated) {
                    statusPill = <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50`}>Activated</span>
                  } else {
                    statusPill = <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50`}>Assigned (Not Activated)</span>
                  }
                } else if (license.status === 'ACTIVE') {
                  statusPill = <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50`}>{isActivated ? 'Activated' : 'Active'}</span>
                } else {
                  statusPill = <span className={`inline-flex items-center ${badgePad} rounded-full font-bold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50`}>Not Activated</span>
                }

                return (
                  <tr key={license.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className={`${tdPad} font-medium text-slate-900 dark:text-white`}>
                      <div className="flex flex-col">
                        <span>{license.productName || 'Unknown Product'}</span>
                        {isAssigned && (
                          <span className="inline-flex items-center mt-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
                            Assigned by {license.assignedByCompany || 'Your Company'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={tdPad}>{license.licenseType || 'N/A'}</td>
                    <td className={tdPad}>
                       <span className="text-slate-900 dark:text-white font-medium">{license.currentActivations || 0}</span> / {license.maxActivations || '1'}
                    </td>
                    <td className={tdPad}>{statusPill}</td>
                    <td className={tdPad}>{expiryStr}</td>
                    <td className={`${tdPad} text-right`}>
                      <div className={`inline-flex items-center space-x-2 ${actionContainerClass}`}>
                        {/* Direct software installer download button */}
                        {downloadedProducts[license.productId] ? (
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
                            onClick={() => handleDownloadSoftware(license.productId)}
                            className={`inline-flex items-center ${btnPad} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-sm`}
                            title="Download software installer"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download
                          </button>
                        )}

                        {/* Activate / Details modal button */}
                        <button 
                          onClick={() => { setSelectedLicense(license); setShowLicenseModal(true); }}
                          className={`inline-flex items-center ${btnPad} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold rounded-lg transition-colors cursor-pointer`}
                        >
                          {isActivated ? 'Manage' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ORDERS & INVOICES TABLE */}
      {(activeTab === 'overview' || activeTab === 'orders') && (
      <div id="orders-invoices" className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-lg overflow-hidden scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Orders & Invoices</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Official purchase history and printable tax invoices for your software licenses.</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders or products..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-48 sm:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#131a2b] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-violet-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loadingOrders}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-[#131a2b] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh Orders"
            >
              <svg className={`w-4 h-4 ${loadingOrders ? 'animate-spin text-violet-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#131a2b] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className={thPad}>Order #</th>
                <th className={thPad}>Product</th>
                <th className={thPad}>Date</th>
                <th className={thPad}>Amount</th>
                <th className={thPad}>Status</th>
                <th className={`${thPad} text-right`}>Invoice Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p className="text-slate-900 dark:text-white font-medium mb-1">{orders.length === 0 ? "You don't have any purchase orders yet." : "No orders match your search criteria."}</p>
                    <p className="text-slate-500 text-sm">When you purchase software licenses, your invoices and billing records will appear here.</p>
                  </td>
                </tr>
              ) : filteredOrders.map(order => {
                const dateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
                const amountFormatted = Number(order.amount || 0).toFixed(2)
                const isCompleted = (order.status || 'COMPLETED').toUpperCase() === 'COMPLETED'

                return (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className={`${tdPad} font-mono font-bold text-slate-900 dark:text-white`}>
                      <div className="flex items-center space-x-2">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                          {order.orderNumber || `ORD-${order.id}`}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdPad} font-medium text-slate-900 dark:text-white`}>
                      <div className="flex flex-col">
                        <span>{order.productName || 'Software License'}</span>
                        {order.quantity > 1 && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Qty: {order.quantity} units</span>
                        )}
                      </div>
                    </td>
                    <td className={tdPad}>{dateStr}</td>
                    <td className={`${tdPad} font-bold text-slate-900 dark:text-white`}>${amountFormatted}</td>
                    <td className={tdPad}>
                      <span className={`inline-flex items-center ${badgePad} rounded-full font-bold ${
                        isCompleted 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                      }`}>
                        {order.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className={`${tdPad} text-right`}>
                      <div className={`inline-flex items-center justify-end space-x-2 ${actionContainerClass}`}>
                        <button
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={downloadingInvoiceId === order.id}
                          className={`inline-flex items-center ${btnPad} bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-sm`}
                          title="Print or Save Invoice as PDF"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                          </svg>
                          Download Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ACTIVATED DEVICES & UNBIND REQUESTS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Activated Devices */}
        {(activeTab === 'overview' || activeTab === 'devices') && (
        <div id="activated-devices" className={`${activeTab === 'devices' ? 'xl:col-span-2' : ''} bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-lg overflow-hidden flex flex-col scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activated Devices</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hardware bound to your active licenses.</p>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-[#131a2b] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={thPad}>Device Name</th>
                  <th className={thPad}>Product / License</th>
                  <th className={thPad}>Last Seen</th>
                  <th className={`${thPad} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center">
                      <p className="text-slate-900 dark:text-white font-medium">No activated devices</p>
                      <p className="text-slate-500 text-sm mt-1">Devices activated with your licenses will appear here.</p>
                    </td>
                  </tr>
                ) : devices.map(device => {
                  const isPending = unbindRequests.some(r => 
                    (r.deviceId == device.id || r.device?.id == device.id) && 
                    (r.licenseId == null || device.licenseId == null || r.licenseId == device.licenseId) && 
                    r.status === 'PENDING'
                  )
                  return (
                    <tr key={`${device.id}-${device.licenseId || '0'}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className={tdPad}>
                        <p className="font-bold text-slate-900 dark:text-white">{device.deviceName || 'Unknown Device'}</p>
                        <p className="text-[10px] text-slate-500">{device.os || 'Unknown OS'}</p>
                      </td>
                      <td className={tdPad}>
                         <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{device.productName || 'N/A'}</p>
                         <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{device.licenseKey || 'Details not mapped in API'}</p>
                      </td>
                      <td className={tdPad}>
                        {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className={`${tdPad} text-right`}>
                        <div className={`inline-flex items-center space-x-2 ${actionContainerClass}`}>
                          <button 
                            onClick={() => { setSelectedDevice(device); setUnbindReason(''); setShowUnbindModal(true); }}
                            disabled={isPending}
                            className={`${btnPad} font-bold rounded-lg transition-all ${
                              isPending
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 cursor-not-allowed opacity-90 shadow-sm'
                                : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-500/20 cursor-pointer'
                            }`}
                          >
                            {isPending ? (
                              <span className="flex items-center space-x-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span>Unbind</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Unbind Requests */}
        {(activeTab === 'overview' || activeTab === 'devices') && (
        <div id="unbind-requests" className={`${activeTab === 'devices' ? 'xl:col-span-2' : ''} bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-lg overflow-hidden flex flex-col scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75`}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unbind Requests</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Status of pending device unbinding.</p>
            </div>
            {activeTab === 'overview' && unbindRequests.length > 0 && (
              <button onClick={() => { hasUserManuallySwitchedTab.current = true; setActiveTab('devices'); }} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">View All &rarr;</button>
            )}
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-[#131a2b] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={thPad}>Device Name</th>
                  <th className={thPad}>Reason</th>
                  <th className={thPad}>Date</th>
                  <th className={`${thPad} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
                {unbindRequests.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center">
                      <p className="text-slate-900 dark:text-white font-medium">No unbind requests</p>
                      <p className="text-slate-500 text-sm mt-1">Your submitted device unbinding requests will appear here.</p>
                    </td>
                  </tr>
                ) : unbindRequests.slice(0, activeTab === 'overview' ? 5 : undefined).map(req => {
                  let statusColor = "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50"
                  if (req.status === 'APPROVED') statusColor = "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50"
                  if (req.status === 'REJECTED') statusColor = "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
                  
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className={`${tdPad} font-medium text-slate-900 dark:text-white`}>{req.device?.deviceName || req.deviceName || req.device?.machineId || `Device #${req.deviceId}`}</td>
                      <td className={`${tdPad} max-w-[200px] truncate`} title={req.reason}>{req.reason}</td>
                      <td className={tdPad}>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className={`${tdPad} text-right`}>
                        <span className={`font-bold uppercase ${badgePad} rounded-full ${statusColor}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* RECENT ACTIVITY TIMELINE */}
      {(activeTab === 'overview' || activeTab === 'activity') && (
      <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md dark:shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit log of your account events.</p>
          </div>
          {activeTab === 'overview' && allActivities.length > 0 && <button onClick={() => setActiveTab('activity')} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">View All &rarr;</button>}
        </div>
        
        <div className="space-y-6">
          {allActivities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No recent activity.</p>
            </div>
          ) : allActivities.slice(0, activeTab === 'overview' ? 5 : undefined).map(log => {
            const actionText = log.featuresUsed || 'Activity Recorded';
            const detailsText = log.durationMinutes ? `Session duration: ${log.durationMinutes} mins` : 'Device authenticated successfully';
            
            let colorClass = "bg-cyan-500";
            if (actionText.toLowerCase().includes('fail') || actionText.toLowerCase().includes('reject')) colorClass = "bg-red-500";
            if (actionText.toLowerCase().includes('success') || actionText.toLowerCase().includes('approve') || actionText.toLowerCase().includes('activated')) colorClass = "bg-emerald-500";

            // Determine activation method and real IP
            let method = log.activationMethod;
            let ip = log.ipAddress;

            // Sanitize legacy records where activation method was stored in IP field
            if (ip === 'Offline Upload') {
              method = 'Offline';
              ip = null;
            } else if (ip === 'QR Approval') {
              method = 'QR';
              ip = null;
            } else if (ip === 'System' || ip === 'Historical (Backfilled)' || ip === '127.0.0.1') {
              ip = null;
            }

            if (!method) {
              const lower = actionText.toLowerCase();
              if (lower.includes('offline')) {
                method = 'Offline';
              } else if (lower.includes('qr')) {
                method = 'QR';
              } else {
                method = 'Online';
              }
            }

            const displayIp = ip || 'N/A';

            return (
              <div key={log.id} className="relative pl-6">
                <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${colorClass} shadow-[0_0_8px_currentColor]`}></div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{actionText}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{detailsText}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {safeDate(log.createdAt || log.sessionStart)?.toLocaleString() || 'Recent'}
                  </p>
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    <p><strong className="font-semibold text-slate-700 dark:text-slate-300">Activation Method:</strong> {method}</p>
                    <p><strong className="font-semibold text-slate-700 dark:text-slate-300">IP:</strong> {displayIp}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* MODALS */}

      {/* Unbind Modal */}
      {showUnbindModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0a0f1c] transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Device Unbinding</h3>
              <button onClick={() => setShowUnbindModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg flex space-x-3 mb-2 transition-colors">
                 <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 <p className="text-xs text-amber-700 dark:text-amber-500/80 leading-relaxed">
                   The device cannot be immediately removed. This request will be sent to an administrator for authorization.
                 </p>
              </div>
              <div className="bg-slate-50 dark:bg-[#131a2b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Device Name</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedDevice?.deviceName || 'Unknown'}</p>
                <div className="flex space-x-6 mt-3">
                   <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Product</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedDevice?.productName || 'Software License'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">License Key</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300">{selectedDevice?.licenseKey ? `${selectedDevice.licenseKey.substring(0, 14)}...` : (selectedDevice?.licenseId ? `ID: ${selectedDevice.licenseId}` : 'Attached')}</p>
                   </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Reason for Unbinding <span className="text-red-500 dark:text-red-400">*</span></label>
                <textarea 
                  value={unbindReason}
                  onChange={(e) => setUnbindReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#131a2b] border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                  rows="3"
                  placeholder="Please state why you want to unbind this device (e.g. Replacing laptop, hardware motherboard failure, reinstalling OS)..."
                ></textarea>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1c] flex justify-end space-x-3 transition-colors">
              <button onClick={() => setShowUnbindModal(false)} className="px-4 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={handleUnbindSubmit} disabled={!unbindReason.trim()} className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">Submit Request</button>
            </div>
          </div>
        </div>
      )}


      {/* License Details Modal */}
      {showLicenseModal && selectedLicense && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0a0f1c] transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">License Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLicense.productName || 'Unknown Product'}</p>
                </div>
              </div>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              
              {/* Removed Full Key display for security policy */}

              {/* Grid Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-sm font-bold ${selectedLicense.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : selectedLicense.status === 'EXPIRED' ? 'text-red-600 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                    {selectedLicense.status}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLicense.licenseType || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Issued Date</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedLicense.createdAt ? new Date(selectedLicense.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Expiration</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedLicense.expiryDate ? new Date(selectedLicense.expiryDate).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 sm:col-span-2 transition-colors">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Activations Used</p>
                  <div className="flex items-end">
                    <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 leading-none">{selectedLicense.currentActivations || 0}</p>
                    <p className="text-sm text-slate-500 font-medium ml-2">/ {selectedLicense.maxActivations || 'âˆž'}</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#131a2b] rounded-xl border border-slate-200 dark:border-slate-800/80 sm:col-span-2 transition-colors">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remaining Activations</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                     {selectedLicense.maxActivations ? (selectedLicense.maxActivations - (selectedLicense.currentActivations || 0)) : 'âˆž'}
                   </p>
                </div>
              </div>

              {/* Activation Options */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">Activation</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* QR Activation */}
                  <div className="flex flex-col items-center justify-center h-full">
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">QR Activation</h5>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 w-full flex flex-col items-center justify-center text-center">
                        <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Use LockStrata Client</p>
                        <p className="text-xs text-slate-500 mt-2">Open the LockStrata Desktop application on your machine to display the QR Code. Scan it with your phone to activate securely.</p>
                    </div>
                  </div>

                  {/* Offline Activation */}
                  <div className="flex flex-col h-full">
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Offline Activation</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Upload a request.json file generated from your air-gapped device.</p>
                    <form onSubmit={handleUploadRequest} className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Request File (.json)</label>
                        <input type="file" required accept=".json" onChange={e => setOfflineRequestFile(e.target.files[0])} className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs bg-slate-50 dark:bg-[#131a2b] text-slate-900 dark:text-white cursor-pointer" />
                      </div>
                      <button type="submit" disabled={!offlineRequestFile || !selectedLicense} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm text-xs mt-4 cursor-pointer">
                        Upload & Download .lic
                      </button>
                    </form>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default CustomerDashboard
