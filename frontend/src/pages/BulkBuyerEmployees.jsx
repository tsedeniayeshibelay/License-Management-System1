import React, { useState, useEffect } from 'react'
import api from '../services/api'

function BulkBuyerEmployees() {
  const [employees, setEmployees] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeDevices, setEmployeeDevices] = useState([])
  const [employeeAssignments, setEmployeeAssignments] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
  // Add Employee Form
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: ''
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [tempCredentials, setTempCredentials] = useState(null)
  const [teamPreferences, setTeamPreferences] = useState({
    allowInvitations: true,
    requireApproval: false,
    autoRelease: true
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [empRes, assignRes, userRes] = await Promise.all([
        api.get('/bulk-buyer/employees'),
        api.get('/bulk-buyer/assignments/recent'),
        api.get('/users/profile').catch(() => ({ data: {} }))
      ])
      setEmployees(empRes.data || [])
      setAssignments(assignRes.data || [])
      if (userRes.data?.preferences) {
        try {
          const parsed = JSON.parse(userRes.data.preferences)
          if (parsed.teamPreferences) {
            setTeamPreferences(parsed.teamPreferences)
          }
        } catch (e) {
          console.error('Failed parsing preferences', e)
        }
      }
      setError(null)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Failed to load employee data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz"
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const digits = "0123456789"
    const specials = "@#$%^&+=!"
    const all = lower + upper + digits + specials
    
    // Ensure at least one of each required class
    let password = [
      lower.charAt(Math.floor(Math.random() * lower.length)),
      upper.charAt(Math.floor(Math.random() * upper.length)),
      digits.charAt(Math.floor(Math.random() * digits.length)),
      specials.charAt(Math.floor(Math.random() * specials.length))
    ]
    
    // Fill the rest up to 12 characters
    for (let i = 4; i < 12; i++) {
      password.push(all.charAt(Math.floor(Math.random() * all.length)))
    }
    
    // Shuffle
    return password.sort(() => Math.random() - 0.5).join('')
  }

  const handleAddEmployee = async (e) => {
    e.preventDefault()
    setAddError(null)
    setAddLoading(true)
    
    const tempPassword = addForm.password?.trim() || generatePassword()
    const payload = {
      fullName: addForm.fullName,
      email: addForm.email,
      username: addForm.username,
      password: tempPassword,
      role: 'CUSTOMER'
    }

    try {
      await api.post('/bulk-buyer/employees', payload)
      setTempCredentials({ username: payload.username, password: tempPassword })
      // Clear form but don't close modal so they can see the password
      setAddForm({ fullName: '', email: '', username: '', password: '' })
      fetchData() // Refresh list
    } catch (err) {
      console.error(err)
      const data = err.response?.data
      const msg = data?.message || (data?.errors ? Object.values(data.errors).join(', ') : null) || data?.error || 'Failed to add employee.'
      setAddError(msg)
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveEmployee = async (emp) => {
    const autoReleaseNotice = teamPreferences.autoRelease
      ? "\n\nPolicy Notice: 'Automatically Release Licenses' is ENABLED. All licenses assigned to this employee will be released back to your pool and their device activations deactivated."
      : "\n\nPolicy Notice: 'Automatically Release Licenses' is DISABLED. Licenses will remain allocated unless manually revoked.";
    
    if (!window.confirm(`Are you sure you want to remove employee "${emp.fullName}" (@${emp.username})?${autoReleaseNotice}`)) {
      return
    }

    try {
      setActionLoading(true)
      await api.delete(`/bulk-buyer/employees/${emp.id}`)
      if (selectedEmployee && selectedEmployee.id === emp.id) {
        setSelectedEmployee(null)
      }
      setActionSuccessMsg(`Employee ${emp.fullName} removed successfully.${teamPreferences.autoRelease ? ' Assigned licenses returned to pool.' : ''}`)
      setTimeout(() => setActionSuccessMsg(''), 5000)
      fetchData()
    } catch (err) {
      console.error("Failed to remove employee", err)
      alert("Failed to remove employee: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveAssignment = async (assignmentId) => {
    try {
      setActionLoading(true)
      await api.post(`/bulk-buyer/assignments/${assignmentId}/approve`)
      setActionSuccessMsg("License assignment approved and activated!")
      setTimeout(() => setActionSuccessMsg(''), 4000)
      fetchData()
      if (selectedEmployee) {
        handleViewDetails(selectedEmployee)
      }
    } catch (err) {
      console.error("Failed to approve assignment", err)
      alert("Failed to approve assignment: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevoke = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to revoke this license assignment?")) return
    
    try {
      setActionLoading(true)
      await api.post(`/bulk-buyer/assignments/${assignmentId}/revoke`)
      setActionSuccessMsg("License assignment revoked successfully.")
      setTimeout(() => setActionSuccessMsg(''), 4000)
      fetchData() // Refresh assignments
      if (selectedEmployee) {
        handleViewDetails(selectedEmployee)
      }
    } catch (err) {
      alert("Failed to revoke license: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewDetails = async (emp) => {
    setSelectedEmployee(emp)
    setEmployeeDevices([])
    setEmployeeAssignments([])
    setDevicesLoading(true)
    try {
      const [devRes, assignRes] = await Promise.all([
        api.get(`/bulk-buyer/employees/${emp.id}/devices`),
        api.get(`/bulk-buyer/employees/${emp.id}/assignments`)
      ])
      setEmployeeDevices(devRes.data || [])
      setEmployeeAssignments(assignRes.data || [])
    } catch (err) {
      console.error("Failed to fetch employee details", err)
    } finally {
      setDevicesLoading(false)
    }
  }

  // Filter Logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // KPIs
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length
  
  // Calculate assigned employees
  const assignedEmployeeIds = new Set(assignments.filter(a => a.status === 'ACTIVE').map(a => a.userId))
  const employeesWithLicenses = assignedEmployeeIds.size

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Team Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your employees and their license access.</p>
        </div>
        <button 
          onClick={() => { 
            setTempCredentials(null); 
            setAddForm({ fullName: '', email: '', username: '', password: generatePassword() });
            setShowAddModal(true); 
          }}
          className="bg-[#0f52ba] hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center shrink-0 cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Add Employee
        </button>
      </div>

      {/* ACTION SUCCESS BANNER */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Team</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeEmployees}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 min-w-0">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">With Licenses</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{employeesWithLicenses}</p>
          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-w-0">
        
        {/* Controls */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="relative max-w-md w-full">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#0f52ba] outline-none text-slate-900 dark:text-white transition-shadow"
            />
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#0f52ba] outline-none text-slate-900 dark:text-white font-medium cursor-pointer transition-shadow"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Licenses</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const empAssignments = assignments.filter(a => a.userId === emp.id && (a.status === 'ACTIVE' || a.status === 'PENDING_APPROVAL'))
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shadow-inner shrink-0">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{emp.fullName}</p>
                            <p className="text-xs text-slate-500 font-mono truncate">@{emp.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {empAssignments.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">None</span>
                          ) : (
                            empAssignments.map(a => (
                              <span key={a.id} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${
                                a.status === 'PENDING_APPROVAL' 
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              }`}>
                                {a.license?.product?.name || 'Unknown Product'}
                                {a.status === 'PENDING_APPROVAL' && ' (Pending)'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          emp.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <button 
                          onClick={() => handleViewDetails(emp)}
                          className="text-xs font-bold text-[#0f52ba] hover:text-blue-700 px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleRemoveEmployee(emp)}
                          disabled={actionLoading}
                          className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer disabled:opacity-50"
                          title="Remove employee from team"
                        >
                          Remove
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

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {tempCredentials ? (
                <div className="space-y-4 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Employee Created!</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Please provide these temporary credentials to the employee. They will not be shown again.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left font-mono text-sm space-y-2 select-all">
                    <div><span className="text-slate-500 select-none">Username:</span> <span className="font-bold text-slate-900 dark:text-white">{tempCredentials.username}</span></div>
                    <div><span className="text-slate-500 select-none">Password:</span> <span className="font-bold text-slate-900 dark:text-white">{tempCredentials.password}</span></div>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setTempCredentials(null); }} className="w-full mt-4 bg-[#0f52ba] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer">
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  {addError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
                      {addError}
                    </div>
                  )}

                  {/* Team Policy Notice */}
                  {teamPreferences.allowInvitations ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start space-x-2">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold">Invitation Email Active:</span> An email with login credentials and access instructions will be sent automatically to this address.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start space-x-2">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Invitations Disabled in Team Preferences:</span> No email will be sent. Temporary credentials will only be displayed on your screen once created.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input required type="text" value={addForm.fullName} onChange={e => setAddForm({...addForm, fullName: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow" placeholder="jane@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                    <input required type="text" value={addForm.username} onChange={e => setAddForm({...addForm, username: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow" placeholder="janedoe" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Temporary Password</label>
                      <button 
                        type="button" 
                        onClick={() => setAddForm(prev => ({ ...prev, password: generatePassword() }))}
                        className="text-xs font-semibold text-[#0f52ba] dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        🎲 Generate Strong
                      </button>
                    </div>
                    <input 
                      required 
                      type="text" 
                      minLength="8"
                      value={addForm.password} 
                      onChange={e => setAddForm({...addForm, password: e.target.value})} 
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0f52ba] transition-shadow font-mono" 
                      placeholder="e.g. TempPass123!" 
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Must be at least 8 chars with uppercase, lowercase, number & symbol (@#$%^&+=!).</p>
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={addLoading} className="w-full sm:flex-1 py-2.5 bg-[#0f52ba] hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center">
                      {addLoading ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : null}
                      {addLoading ? 'Creating...' : 'Create Employee'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE DETAILS MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 shrink-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Employee Details</h3>
              <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl shadow-inner border border-blue-200 dark:border-blue-800 shrink-0 mb-4 sm:mb-0 mx-auto sm:mx-0">
                    {selectedEmployee.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedEmployee.fullName}</h2>
                    <p className="text-sm text-slate-500 mb-2">{selectedEmployee.email} • @{selectedEmployee.username}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedEmployee.status === 'ACTIVE' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {selectedEmployee.status}
                    </span>
                  </div>
                </div>
                
                {/* Remove employee button */}
                <div className="flex justify-center sm:justify-end">
                  <button
                    onClick={() => handleRemoveEmployee(selectedEmployee)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold rounded-lg transition-colors flex items-center shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Remove Employee
                  </button>
                </div>
              </div>

              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Assigned Licenses</h4>
              
              <div className="space-y-4">
                {devicesLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0f52ba]"></div>
                  </div>
                ) : employeeAssignments.length === 0 ? (
                  <div className="text-sm text-slate-500 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    This employee currently has no active license assignments.
                  </div>
                ) : (
                  employeeAssignments.map(a => (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{a.license?.product?.name || 'Software License'}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${
                            a.status === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                              : a.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-300'
                          }`}>
                            {a.status === 'PENDING_APPROVAL' ? 'Pending Approval' : a.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Assigned: {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : 'N/A'}
                          {a.license?.expiryDate && <> · Expires: {new Date(a.license.expiryDate).toLocaleDateString()}</>}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 shrink-0">
                        {a.status === 'PENDING_APPROVAL' && (
                          <button 
                            onClick={() => handleApproveAssignment(a.id)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer flex items-center disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            Approve
                          </button>
                        )}
                        {(a.status === 'ACTIVE' || a.status === 'PENDING_APPROVAL') && (
                          <button 
                            onClick={() => handleRevoke(a.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {a.status === 'PENDING_APPROVAL' ? 'Reject' : 'Revoke Access'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DEVICES SECTION */}
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Active Devices</h4>
              
              <div className="space-y-4">
                {devicesLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0f52ba]"></div>
                  </div>
                ) : employeeDevices.length === 0 ? (
                  <div className="text-sm text-slate-500 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    This employee has not activated the software on any devices.
                  </div>
                ) : (
                  employeeDevices.map(device => (
                    <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          <p className="font-bold text-slate-900 dark:text-white truncate">{device.deviceName || 'Unknown Device'}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            device.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {device.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          OS: {device.os || 'N/A'} {device.osVersion ? `(${device.osVersion})` : ''} â€¢ Last Seen: {new Date(device.lastSeen).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}

export default BulkBuyerEmployees
