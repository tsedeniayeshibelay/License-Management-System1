import React, { useState, useEffect } from 'react'
import api from '../services/api'

function BulkBuyerLicenses() {
  const [licenses, setLicenses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modals & Assignment configuration
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [defaultAssignmentMode, setDefaultAssignmentMode] = useState('Employee + Device')
  const [employeeDevices, setEmployeeDevices] = useState([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [assignForm, setAssignForm] = useState({
    licenseId: '',
    employeeId: '',
    deviceId: '',
    assignmentType: 'Employee + Device'
  })
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [licRes, assignRes, empRes, userRes] = await Promise.all([
        api.get('/licenses'),
        api.get('/bulk-buyer/assignments/recent'),
        api.get('/bulk-buyer/employees'),
        api.get('/users/profile')
      ])
      setLicenses(licRes.data?.content || licRes.data || [])
      setAssignments(assignRes.data || [])
      setEmployees(empRes.data || [])
      if (userRes.data?.preferences) {
        try {
          const prefs = JSON.parse(userRes.data.preferences)
          if (prefs.licenseManagement?.defaultAssignment) {
            const defMode = prefs.licenseManagement.defaultAssignment
            setDefaultAssignmentMode(defMode)
            setAssignForm(prev => ({
              ...prev,
              assignmentType: defMode
            }))
          }
        } catch (e) {
          // Ignore
        }
      }
      setError(null)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Failed to load license data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeChange = async (empId) => {
    setAssignForm(prev => ({ ...prev, employeeId: empId, deviceId: '' }))
    if (!empId) {
      setEmployeeDevices([])
      return
    }
    try {
      setLoadingDevices(true)
      const res = await api.get(`/bulk-buyer/employees/${empId}/devices`)
      setEmployeeDevices(res.data || [])
    } catch (err) {
      console.error('Failed to load employee devices', err)
      setEmployeeDevices([])
    } finally {
      setLoadingDevices(false)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssignError(null)
    setAssignLoading(true)

    try {
      const payload = {
        licenseId: parseInt(assignForm.licenseId),
        assignmentType: assignForm.assignmentType
      }
      if (assignForm.employeeId) {
        payload.employeeId = parseInt(assignForm.employeeId)
      }
      if (assignForm.deviceId) {
        payload.deviceId = parseInt(assignForm.deviceId)
      }

      await api.post('/bulk-buyer/assignments/assign', payload)
      setShowAssignModal(false)
      setAssignForm({
        licenseId: '',
        employeeId: '',
        deviceId: '',
        assignmentType: defaultAssignmentMode
      })
      setEmployeeDevices([])
      fetchData() // Refresh to update capacities and assignments
    } catch (err) {
      console.error(err)
      setAssignError(err.response?.data?.message || 'Failed to assign license.')
    } finally {
      setAssignLoading(false)
    }
  }

  const handleRevoke = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to revoke this license? The seat will become available immediately.")) return
    
    try {
      await api.post(`/bulk-buyer/assignments/${assignmentId}/revoke`)
      fetchData() // Refresh assignments and capacities
    } catch (err) {
      alert("Failed to revoke license: " + (err.response?.data?.message || err.message))
    }
  }

  const handleApprove = async (assignmentId) => {
    try {
      await api.post(`/bulk-buyer/assignments/${assignmentId}/approve`)
      fetchData() // Refresh assignments and capacities
      alert("✅ License assignment approved and activated!")
    } catch (err) {
      alert("Failed to approve assignment: " + (err.response?.data?.message || err.message))
    }
  }

  // KPIs
  const totalSeats = licenses.reduce((sum, lic) => sum + (lic.totalSeats || 0), 0)
  const assignedSeats = licenses.reduce((sum, lic) => sum + (lic.usedSeats || 0), 0)
  const availableSeats = totalSeats - assignedSeats
  
  // Calculate expiring soon (within 30 days)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
  const expiringSoonLicenses = licenses.filter(l => {
    if (!l.expiryDate) return false
    const expDate = new Date(l.expiryDate)
    return expDate > now && expDate <= thirtyDaysFromNow
  }).length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f52ba]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">License Pools</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your company's purchased volume licenses.</p>
        </div>
        <button 
          onClick={() => setShowAssignModal(true)}
          className="bg-[#0f52ba] hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center shrink-0"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Assign License
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Seats</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSeats}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{assignedSeats}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{availableSeats}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring Soon</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{expiringSoonLicenses}</p>
          </div>
        </div>
      </div>

      {/* LICENSE POOLS */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Your Purchased Pools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {licenses.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            You do not own any volume licenses.
          </div>
        ) : (
          licenses.map(lic => {
            const used = lic.usedSeats || 0
            const total = lic.totalSeats || 1 // Avoid divide by zero
            const available = total - used
            const pct = Math.min(Math.round((used / total) * 100), 100)
            
            // Color coding based on utilization
            let barColor = "bg-emerald-500"
            if (pct > 80) barColor = "bg-amber-500"
            if (pct > 95) barColor = "bg-red-500"

            return (
              <div key={lic.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0 pr-4">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{lic.productName || lic.product?.name || 'Software Product'}</h3>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    lic.status === 'ACTIVE' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                      : lic.status === 'NOT_ACTIVATED'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                  }`}>
                    {lic.status}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">{used} / {total} assigned</span>
                    <span className="text-slate-500">{available} available</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Expires: {lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : 'Never'}
                  </div>
                  <button 
                    onClick={() => { setAssignForm({ ...assignForm, licenseId: lic.id.toString() }); setShowAssignModal(true); }}
                    className="text-[#0f52ba] font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={available === 0 || (lic.status !== 'ACTIVE' && lic.status !== 'NOT_ACTIVATED')}
                  >
                    Assign Seat
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ACTIVE ASSIGNMENTS */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-8">Recent Assignments</h2>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product License</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mode & Binding</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No active assignments.
                  </td>
                </tr>
              ) : (
                assignments.map(a => {
                  const emp = employees.find(e => e.id === a.userId)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shadow-inner shrink-0 text-xs">
                            {emp ? emp.fullName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{emp ? emp.fullName : 'Unknown Employee'}</p>
                            <p className="text-xs text-slate-500 truncate">{emp ? emp.email : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{a.license?.product?.name || 'Unknown Product'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {a.assignmentType || 'Employee + Device'}
                          </span>
                          {a.device ? (
                            <span className="text-[11px] text-slate-500 flex items-center mt-0.5">
                              💻 {a.device.deviceName || a.device.machineId}
                            </span>
                          ) : a.assignmentType === 'Device' ? (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Device Unbound</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{new Date(a.assignedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          a.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                            : a.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                        }`}>
                          {a.status === 'PENDING_APPROVAL' ? 'Pending Approval' : a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {a.status === 'PENDING_APPROVAL' && (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleApprove(a.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRevoke(a.id)}
                              className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {a.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleRevoke(a.id)}
                            className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 px-3 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800/50 cursor-pointer"
                          >
                            Revoke
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

      {/* ASSIGN LICENSE MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Assign License Seat</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleAssign} className="space-y-4">
                {assignError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
                    {assignError}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select License Pool</label>
                  <select 
                    required 
                    value={assignForm.licenseId} 
                    onChange={e => setAssignForm({...assignForm, licenseId: e.target.value})} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow"
                  >
                    <option value="" disabled>Choose a license...</option>
                    {licenses.length === 0 && (
                      <option value="" disabled>No licenses owned. Please purchase volume licenses from Catalog.</option>
                    )}
                    {licenses.filter(l => {
                      const status = (l.status || '').toUpperCase();
                      return status === 'ACTIVE' || status === 'NOT_ACTIVATED' || status === '';
                    }).map(lic => {
                      const total = lic.totalSeats || lic.maxActivations || 1;
                      const used = lic.usedSeats || 0;
                      const available = total - used;
                      const name = lic.productName || lic.product?.name || `License #${lic.id}`;
                      return (
                        <option key={lic.id} value={lic.id} disabled={available <= 0}>
                          {name} — {available > 0 ? `${available} seats available` : 'All seats assigned'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Assignment Mode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Mode</label>
                    <span className="text-[10px] text-slate-400 font-medium">Default: {defaultAssignmentMode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Employee', 'Device', 'Employee + Device'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAssignForm({ ...assignForm, assignmentType: m, deviceId: '' })}
                        className={`px-2 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer ${
                          assignForm.assignmentType === m
                            ? 'bg-[#0f52ba] text-white border-[#0f52ba] shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {assignForm.assignmentType === 'Employee' && 'Assigns license to employee account without requiring device binding.'}
                    {assignForm.assignmentType === 'Device' && 'Binds license directly to a specific device of the employee.'}
                    {assignForm.assignmentType === 'Employee + Device' && 'Assigns to employee with optional pre-selected device or auto-bind.'}
                  </p>
                </div>
                
                {/* Select Employee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
                  <select 
                    required 
                    value={assignForm.employeeId} 
                    onChange={e => handleEmployeeChange(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow"
                  >
                    <option value="" disabled>Choose an employee...</option>
                    {employees.filter(e => e.status === 'ACTIVE').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Device Selector (if Device or Employee + Device) */}
                {(assignForm.assignmentType === 'Device' || assignForm.assignmentType === 'Employee + Device') && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {assignForm.assignmentType === 'Device' ? 'Target Device (Required)' : 'Target Device (Optional)'}
                      </label>
                      {loadingDevices && <span className="text-[10px] text-slate-400">Loading devices...</span>}
                    </div>
                    <select
                      required={assignForm.assignmentType === 'Device'}
                      disabled={!assignForm.employeeId || loadingDevices}
                      value={assignForm.deviceId}
                      onChange={e => setAssignForm({ ...assignForm, deviceId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow disabled:opacity-50"
                    >
                      <option value="">
                        {!assignForm.employeeId 
                          ? 'Select an employee first...' 
                          : assignForm.assignmentType === 'Device' 
                            ? 'Choose a device...' 
                            : 'Auto-bind upon first device activation (None selected)'}
                      </option>
                      {employeeDevices.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.deviceName || d.machineId} ({d.os || 'Unknown OS'}{d.isActive ? ' - Active' : ''})
                        </option>
                      ))}
                    </select>
                    {assignForm.employeeId && employeeDevices.length === 0 && !loadingDevices && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                        {assignForm.assignmentType === 'Device' 
                          ? 'This employee has no active devices registered. Register a device first or use Employee mode.' 
                          : 'No active devices registered yet. Seat will be auto-bound on first device activation.'}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="pt-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="w-full sm:flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={
                      assignLoading || 
                      !assignForm.licenseId || 
                      !assignForm.employeeId || 
                      (assignForm.assignmentType === 'Device' && !assignForm.deviceId)
                    } 
                    className="w-full sm:flex-1 py-2.5 bg-[#0f52ba] hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  >
                    {assignLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : null}
                    {assignLoading ? 'Assigning...' : 'Assign License'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}

export default BulkBuyerLicenses
