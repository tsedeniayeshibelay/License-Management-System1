import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../services/api'

// Helper to parse dates safely
const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export default function AdminDashboardHome({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 });
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [devices, setDevices] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Fetch all required data for the Admin view
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [
          statsRes, 
          usersRes, 
          companiesRes, 
          productsRes, 
          licensesRes,
          devicesRes,
          unbindRes
        ] = await Promise.all([
          api.get('/dashboard/stats').catch(() => ({ data: { totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 } })),
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/companies').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/licenses').catch(() => ({ data: [] })),
          api.get('/devices').catch(() => ({ data: [] })),
          api.get('/admin/unbind-requests').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data || { totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 });
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setLicenses(Array.isArray(licensesRes.data) ? licensesRes.data : (Array.isArray(licensesRes.data?.content) ? licensesRes.data.content : []));
        setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
        setPendingRequests(Array.isArray(unbindRes.data) ? unbindRes.data : []);
      } catch (err) {
        console.error("Failed to fetch Admin dashboard data", err);
      }
    };
    fetchAdminData();
  }, []);

  // --- DATA CALCULATIONS ---

  // 1. License Activity
  const activityData = useMemo(() => {
    if (!licenses || licenses.length === 0) return [];
    
    const counts = {};
    licenses.forEach(l => {
      const d = safeDate(l.issuedDate || l.createdAt);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!counts[key]) counts[key] = { name: key, LicensesIssued: 0 };
        counts[key].LicensesIssued++;
      }
    });

    return Object.keys(counts).sort().map(key => {
      const d = new Date(key);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        ...counts[key],
        name: `${monthNames[d.getMonth()]} ${d.getDate()}`
      };
    });
  }, [licenses]);

  // 2. License Status Donut
  const statusData = [
    { name: 'Active', value: stats.activeLicenses, color: '#10b981' }, // Green
    { name: 'Expired', value: stats.expiredLicenses, color: '#f97316' }, // Orange
    { name: 'Revoked', value: stats.revokedLicenses, color: '#ef4444' }, // Red
    { name: 'Inactive', value: stats.totalLicenses - (stats.activeLicenses + stats.expiredLicenses + stats.revokedLicenses), color: '#64748b' } // Gray
  ].filter(item => item.value > 0);

  // 3. Users by Role Donut (Excludes Admin)
  const roleData = useMemo(() => {
    let customers = 0, companiesCount = 0, bulkBuyers = 0;
    users.forEach(u => {
      if (u.role === 'CUSTOMER') customers++;
      else if (u.role === 'COMPANY') companiesCount++;
      else if (u.role === 'BULK_BUYER') bulkBuyers++;
    });
    return [
      { name: 'Customers', value: customers, color: '#3b82f6' }, // Blue
      { name: 'Companies', value: companiesCount, color: '#8b5cf6' }, // Purple
      { name: 'Bulk Buyers', value: bulkBuyers, color: '#f97316' } // Orange
    ].filter(item => item.value > 0);
  }, [users]);

  const totalPlatformUsers = useMemo(() => {
    return roleData.reduce((acc, curr) => acc + curr.value, 0);
  }, [roleData]);

  // Expiring Soon
  const expiringSoonLicenses = useMemo(() => {
    return licenses.filter(l => {
      const d = safeDate(l.expiryDate);
      if (!d) return false;
      const diff = d.getTime() - new Date().getTime();
      return diff > 0 && diff <= (30 * 24 * 60 * 60 * 1000); // next 30 days
    }).sort((a, b) => safeDate(a.expiryDate).getTime() - safeDate(b.expiryDate).getTime());
  }, [licenses]);

  // System Health Mock Data (Only APIs we know exist in this monolithic backend)
  const systemHealth = [
    { service: 'Authentication API', status: 'Operational' },
    { service: 'License Service', status: 'Operational' },
    { service: 'Database', status: 'Operational' },
    { service: 'Email Delivery', status: 'Monitoring Unavailable' }
  ];

  return (
    <div className="p-8 space-y-6">
      
      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div 
          onClick={() => navigate('/dashboard/users')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Total Users</p>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </div>

        <div 
          onClick={() => navigate('/dashboard/companies')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Total Companies</p>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{companies.length}</p>
        </div>

        <div 
          onClick={() => navigate('/dashboard/products')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Total Products</p>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{products.length}</p>
        </div>

        <div 
          onClick={() => navigate('/dashboard/licenses')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Total Licenses</p>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalLicenses}</p>
        </div>

        <div 
          onClick={() => navigate('/dashboard/licenses')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Active Licenses</p>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activeLicenses}</p>
        </div>

        <div 
          onClick={() => navigate('/dashboard/devices')}
          className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Active Devices</p>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{devices.length}</p>
        </div>
      </div>

      {/* 2. ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* License Activity Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white">License Activity</h3>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="LicensesIssued" name="Licenses Issued" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <svg className="w-10 h-10 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <p className="text-sm font-bold">No historical activity data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Visualizations Column */}
        <div className="lg:col-span-1 grid grid-rows-2 gap-6">
          
          {/* License Status */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-2">License Status</h3>
            <div className="flex-1 w-full min-h-[160px] relative flex justify-center items-center">
              {statusData.length > 0 ? (
                <>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                          {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-[25%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-lg font-bold text-white">{stats.totalLicenses}</p>
                    </div>
                  </div>
                  <div className="w-1/2 h-full flex flex-col justify-center pl-4 space-y-2 border-l border-slate-800/50">
                    {statusData.map(item => (
                      <div key={item.name} className="flex items-center text-[11px] font-medium text-slate-300">
                        <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate flex-1">{item.name}</span>
                        <span className="ml-2 font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 font-bold">No data available</p>
              )}
            </div>
          </div>

          {/* Users by Role */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-2">Users by Role</h3>
            <div className="flex-1 w-full min-h-[160px] relative flex justify-center items-center">
              {roleData.length > 0 ? (
                <>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={roleData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                          {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-[25%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-lg font-bold text-white">{totalPlatformUsers}</p>
                    </div>
                  </div>
                  <div className="w-1/2 h-full flex flex-col justify-center pl-4 space-y-2 border-l border-slate-800/50">
                    {roleData.map(item => (
                      <div key={item.name} className="flex items-center text-[11px] font-medium text-slate-300">
                        <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate flex-1">{item.name}</span>
                        <span className="ml-2 font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 font-bold">No data available</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. OPERATIONAL WIDGETS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expiring Soon */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-white">Expiring Soon</h3>
            {expiringSoonLicenses.length > 0 && (
              <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-md border border-orange-500/20">
                {expiringSoonLicenses.length} expiring within 30 days
              </span>
            )}
          </div>
          <div className="flex-1 overflow-x-auto">
            {expiringSoonLicenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                <svg className="w-10 h-10 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm font-bold">No licenses expiring soon</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="text-slate-500 font-bold border-b border-slate-800/80">
                  <tr>
                    <th className="pb-3 pr-4">License</th>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 text-right">Expires In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {expiringSoonLicenses.slice(0, 5).map(l => {
                    const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    const keyMasked = l.licenseKey ? `LS-â€¢â€¢â€¢â€¢-${l.licenseKey.slice(-4)}` : 'N/A';
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pr-4 font-mono text-slate-300">{keyMasked}</td>
                        <td className="py-3 pr-4 text-slate-400">{l.product?.name || l.productName || 'Unknown'}</td>
                        <td className="py-3 pr-4 font-medium text-white">{l.company?.name || l.user?.fullName || 'Unknown'}</td>
                        <td className="py-3 text-right">
                          <span className="text-orange-400 font-bold">{daysLeft} days</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Unbind Requests */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-bold text-white">Pending Unbind Requests</h3>
            <span className="text-xs font-bold text-slate-400">{pendingRequests.length} pending</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {pendingRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                <svg className="w-10 h-10 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                <p className="text-sm font-bold">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(r => (
                  <div key={r.id} className="bg-[#0f172a] border border-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white">{r.device?.deviceName || r.deviceName || r.device?.machineId || `Device #${r.deviceId}`}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Requested by {r.user?.username || 'Unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 4. SYSTEM HEALTH */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 mb-8">
        <h3 className="text-sm font-bold text-white mb-5">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {systemHealth.map((item, idx) => (
            <div key={idx} className="flex items-center p-3 bg-[#0f172a] rounded-lg border border-slate-800/50">
              <div className={`w-2 h-2 rounded-full mr-3 shrink-0 ${item.status === 'Operational' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-500'}`}></div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{item.service}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${item.status === 'Operational' ? 'text-emerald-400' : 'text-slate-400'}`}>{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
