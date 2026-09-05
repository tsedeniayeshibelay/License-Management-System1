import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function BulkBuyerAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const res = await api.get('/bulk-buyer/analytics')
        setData(res.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch analytics', err)
        setError('Could not load analytics data. Please make sure the backend is updated.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const [userViewMode, setUserViewMode] = useState('list')

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (error || !data) {
    return (
      <div className="p-8 flex flex-col justify-center items-center h-full text-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Try Again</button>
      </div>
    )
  }

  // Transform OS distribution to array for Recharts
  const osData = data.osDistribution ? Object.keys(data.osDistribution).map(key => ({
    name: key,
    value: data.osDistribution[key]
  })) : []

  const hasOsData = osData.length > 0
  const finalOsData = hasOsData ? osData : [{ name: 'No Devices', value: 1 }]

  // Transform top users to array for Recharts
  const topUsers = data.topUsers || []
  const hasAnyActiveDevices = (data.totalActiveDevices || 0) > 0
  const hasAnyLicenses = (data.totalActiveLicenses || 0) > 0 || topUsers.some(u => (u.activeLicensesCount || 0) > 0)
  const maxLicenses = Math.max(0, ...topUsers.map(u => u.activeLicensesCount || 0))
  const maxDevices = Math.max(0, ...topUsers.map(u => u.activeDevicesCount || 0))
  const maxCombined = Math.max(1, maxLicenses, maxDevices)

  const topUsersData = topUsers.map(u => ({
    name: u.fullName || (u.email ? u.email.split('@')[0] : 'Employee'),
    fullName: u.fullName || u.email || 'Employee',
    email: u.email,
    'Software Licenses': u.activeLicensesCount || 0,
    'Active Devices': u.activeDevicesCount || 0,
    activeLicensesCount: u.activeLicensesCount || 0,
    activeDevicesCount: u.activeDevicesCount || 0,
    total: (u.activeLicensesCount || 0) + (u.activeDevicesCount || 0)
  }))

  const recentActivations = data.recentActivations || []

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Usage & Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Aggregated device and usage insights across all your employees.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 tracking-wider">TOTAL ACTIVE DEVICES</p>
            <p className="text-4xl font-extrabold text-blue-600 mt-1">{data.totalActiveDevices}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 tracking-wider">ACTIVE LICENSES</p>
            <p className="text-4xl font-extrabold text-indigo-600 mt-1">{data.totalActiveLicenses || 0}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 tracking-wider">REGISTERED EMPLOYEES</p>
            <p className="text-4xl font-extrabold text-emerald-600 mt-1">{data.totalEmployees}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* OS DISTRIBUTION DONUT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Operating Systems</h3>
            <p className="text-xs text-slate-500 mb-3">Active platform and OS share</p>
            <div className="w-full h-[210px] relative mt-1">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={finalOsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={hasOsData && finalOsData.length > 1 ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {finalOsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={hasOsData ? COLORS[index % COLORS.length] : '#cbd5e1'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{data.totalActiveDevices}</span>
                <span className="text-xs text-slate-500 font-medium">Total</span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {finalOsData.map((entry, index) => (
                <div key={index} className="flex justify-between items-center text-xs md:text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hasOsData ? COLORS[index % COLORS.length] : '#cbd5e1' }}></div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOP USERS LEADERBOARD & BAR CHART */}
        <div className="lg:col-span-2 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Top Power Users</h3>
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold">
                    {topUsers.length} {topUsers.length === 1 ? 'Employee' : 'Employees'}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">Employees ranked by active software installations & devices.</p>
              </div>

              {/* View Toggle */}
              {topUsers.length > 0 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUserViewMode('list')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      userViewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📋 List
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserViewMode('chart')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      userViewMode === 'chart'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📊 Bar Chart
                  </button>
                </div>
              )}
            </div>

            {topUsers.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span>No registered employees yet</span>
              </div>
            ) : userViewMode === 'list' ? (
              <div className="space-y-3">
                {topUsers.map((u, idx) => {
                  const devCount = u.activeDevicesCount || 0;
                  const licCount = u.activeLicensesCount || 0;
                  const totalCount = licCount + devCount;
                  const name = u.fullName || u.email || 'Employee';
                  const initial = (name.charAt(0) || 'E').toUpperCase();

                  return (
                    <div key={u.id || idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{name}</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">#{idx + 1}</span>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{u.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            licCount > 0 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50' 
                              : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            📦 {licCount} {licCount === 1 ? 'License' : 'Licenses'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            devCount > 0 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                              : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            💻 {devCount} {devCount === 1 ? 'Device' : 'Devices'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Utilization Bar */}
                      {totalCount > 0 ? (
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                            {licCount > 0 && (
                              <div 
                                className="bg-indigo-600 h-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(12, (licCount / maxCombined) * 60))}%` }}
                                title={`${licCount} Software Licenses`}
                              />
                            )}
                            {devCount > 0 && (
                              <div 
                                className="bg-emerald-500 h-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(12, (devCount / maxCombined) * 40))}%` }}
                                title={`${devCount} Active Devices`}
                              />
                            )}
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                            <span>{licCount} software installation{licCount !== 1 ? 's' : ''} assigned</span>
                            <span>{devCount} active hardware device{devCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>Registered employee &bull; 0 licenses assigned & 0 devices bound yet.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 min-w-0">
                {!hasAnyActiveDevices && hasAnyLicenses && (
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-400 flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Software licenses are assigned. Hardware client devices will link as soon as software is launched on employee machines.</span>
                  </div>
                )}
                {!hasAnyActiveDevices && !hasAnyLicenses && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-center space-x-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span>All registered employees currently have 0 active licenses and 0 devices. Assign licenses in the Licenses tab to track usage.</span>
                  </div>
                )}

                <div className="w-full h-[240px] relative min-w-0">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart 
                      data={topUsersData} 
                      margin={{ top: 15, right: 30, left: 10, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#475569', opacity: 0.3 }}
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                      />
                      <YAxis 
                        type="number" 
                        allowDecimals={false} 
                        domain={[0, Math.max(2, maxCombined + 1)]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        width={35} 
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const u = payload[0]?.payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 text-white">
                              <p className="font-bold text-sm text-slate-100">{u?.fullName || label}</p>
                              {u?.email && <p className="text-slate-400 text-[11px] font-mono">{u.email}</p>}
                              <div className="pt-1.5 border-t border-slate-800 space-y-1">
                                <div className="flex justify-between items-center space-x-4">
                                  <span className="flex items-center space-x-1.5 text-indigo-400 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    <span>Software Licenses:</span>
                                  </span>
                                  <span className="font-bold">{u?.activeLicensesCount || 0}</span>
                                </div>
                                <div className="flex justify-between items-center space-x-4">
                                  <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Active Devices:</span>
                                  </span>
                                  <span className="font-bold">{u?.activeDevicesCount || 0}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{value}</span>}
                      />
                      <Bar 
                        dataKey="Software Licenses" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45} 
                        minPointSize={4} 
                      />
                      <Bar 
                        dataKey="Active Devices" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45} 
                        minPointSize={4} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Ranked by verified client activations & software licenses</span>
            <div className="flex items-center space-x-3 font-semibold text-slate-700 dark:text-slate-300">
              <span>Licenses: {data.totalActiveLicenses || 0}</span>
              <span>&bull;</span>
              <span>Devices: {data.totalActiveDevices || 0}</span>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT ACTIVATIONS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
           <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Activations</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold sticky top-0">
              <tr>
                <th className="px-6 py-4">Device / OS</th>
                <th className="px-6 py-4">Hardware Signature</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Activated On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    No recent device activations.
                  </td>
                </tr>
              ) : (
                recentActivations.map(device => (
                  <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{device.deviceName || (device.machineId ? device.machineId.substring(0,8) : 'Unknown')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{device.os || 'Unknown OS'} {device.osVersion || ''}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {device.machineId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {device.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {device.activatedAt ? new Date(device.activatedAt).toLocaleString() : 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default BulkBuyerAnalytics
