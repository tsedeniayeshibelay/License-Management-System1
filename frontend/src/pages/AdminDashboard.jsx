import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../services/api'

// Helper to parse dates safely (handles both ISO strings and Spring Boot LocalDateTime arrays)
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

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 });
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [devices, setDevices] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);

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
          unbindRes,
          logsRes
        ] = await Promise.all([
          api.get('/dashboard/stats').catch(() => ({ data: { totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 } })),
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/companies').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/licenses').catch(() => ({ data: [] })),
          api.get('/devices').catch(() => ({ data: [] })),
          api.get('/admin/unbind-requests').catch(() => ({ data: [] })),
          api.get('/usage-logs').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data || { totalLicenses: 0, activeLicenses: 0, expiredLicenses: 0, revokedLicenses: 0 });
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setLicenses(Array.isArray(licensesRes.data) ? licensesRes.data : (Array.isArray(licensesRes.data?.content) ? licensesRes.data.content : []));
        setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
        setPendingRequests(Array.isArray(unbindRes.data) ? unbindRes.data : []);
        setUsageLogs(Array.isArray(logsRes.data) ? logsRes.data : []);

      } catch (err) {
        console.error("Failed to fetch Admin dashboard data", err);
      }
    };
    fetchAdminData();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/unbind-requests/${id}/${action}`);
      // Refresh unbind requests
      const res = await api.get('/admin/unbind-requests');
      setPendingRequests(res.data);
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
      alert(err.response?.data?.message || `Failed to ${action} request`);
    }
  };

  // --- DATA CALCULATIONS ---

  // 1. License Activity (Only Licenses Issued is supported historically by /licenses)
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

  // Recent Licenses
  const sortedLicenses = useMemo(() => {
    return [...licenses].sort((a, b) => {
      const da = safeDate(a.issuedDate || a.createdAt)?.getTime() || 0;
      const db = safeDate(b.issuedDate || b.createdAt)?.getTime() || 0;
      return db - da;
    });
  }, [licenses]);

  // System Health Mock Data (Only APIs we know exist in this monolithic backend)
  const systemHealth = [
    { service: 'Authentication API', status: 'Operational' },
    { service: 'License Service', status: 'Operational' },
    { service: 'Database', status: 'Operational' }, // if we can fetch data, db is up
    { service: 'Email Delivery', status: 'Monitoring Unavailable' } // No direct health check
  ];


  // If the active tab is anything other than dashboard, show a clean empty state for now.
  if (activeTab !== 'dashboard') {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex font-sans">
        {/* SIDEBAR PLACEHOLDER */}
        <aside className="w-[250px] bg-[#070b14] border-r border-slate-800/60 flex-shrink-0 flex flex-col items-center justify-center p-6">
           <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold shadow-md text-white hover:bg-indigo-700">â† Back to Dashboard</button>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <h2 className="text-xl font-bold text-white mb-2">Module Loaded</h2>
            <p className="text-sm text-slate-400">Detailed management screens are maintained separately.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex font-sans selection:bg-indigo-500/30">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* FIXED SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[250px] bg-[#070b14] border-r border-slate-800/60 flex-shrink-0 flex flex-col h-screen overflow-y-auto transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} scrollbar-thin scrollbar-thumb-slate-800`}>
        <div className="p-6 flex flex-col mb-2">
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">LockStrata</h1>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium pl-11">Enterprise License Mgmt</p>
        </div>

        <nav className="flex-1 px-4 pb-8 space-y-6">
          {/* MAIN */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main</p>
            <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-indigo-500/15 text-white border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <svg className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span className="text-sm font-medium">Dashboard</span>
            </button>
          </div>

          {/* MANAGEMENT */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Management</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span className="text-sm font-medium">Users</span>
              </button>
              <button onClick={() => { setActiveTab('companies'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'companies' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                <span className="text-sm font-medium">Companies</span>
              </button>
              <button onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                <span className="text-sm font-medium">Products</span>
              </button>
            </div>
          </div>

          {/* LICENSING */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Licensing</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('licenses'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'licenses' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                <span className="text-sm font-medium">Licenses</span>
              </button>
              <button onClick={() => { setActiveTab('license-types'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'license-types' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                <span className="text-sm font-medium">License Types & Rules</span>
              </button>
            </div>
          </div>

          {/* OPERATIONS */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operations</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('activations'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'activations' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                <span className="text-sm font-medium">Activations</span>
              </button>
              <button onClick={() => { setActiveTab('devices'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'devices' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span className="text-sm font-medium">Devices</span>
              </button>
              <button onClick={() => { setActiveTab('unbind'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors flex justify-between ${activeTab === 'unbind' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                  <span className="text-sm font-medium">Unbind Requests</span>
                </div>
                {pendingRequests.length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* MONITORING */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Monitoring</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <span className="text-sm font-medium">Analytics</span>
              </button>
              <button onClick={() => { setActiveTab('activity-log'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'activity-log' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="text-sm font-medium">Activity Log</span>
              </button>
            </div>
          </div>

          {/* SECURITY */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Security</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('security'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'security' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <span className="text-sm font-medium">Security Center</span>
              </button>
              <button onClick={() => { setActiveTab('alerts'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'alerts' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span className="text-sm font-medium">Alerts</span>
              </button>
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">System</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('config'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm font-medium">System Configuration</span>
              </button>
              <button onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span className="text-sm font-medium">Reports</span>
              </button>
            </div>
          </div>

          {/* SUPPORT */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Support</p>
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('support'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'support' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span className="text-sm font-medium">Support</span>
              </button>
            </div>
          </div>
        </nav>

        {/* BOTTOM USER PROFILE & ACCOUNT */}
        <div className="mt-auto border-t border-slate-800/60 p-4 space-y-3">
          
          <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-500/15 text-white border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="text-sm font-medium">Settings</span>
          </button>
          
          <div className="flex items-center space-x-3 p-2 bg-[#151d2e] border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">{user.username}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email || 'Super Administrator'}</p>
            </div>
          </div>
          
          <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
          
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19]">
        
        {/* HEADER */}
        <header className="h-20 flex items-center justify-between px-6 md:px-8 border-b border-slate-800/60 sticky top-0 bg-[#0b0f19]/90 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center">
                {user?.loginCount === 1 ? 'Welcome' : 'Welcome back'}, {user.username.split(' ')[0]} <span className="ml-2 text-xl">👋</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1 hidden sm:block">Here's what's happening across the LockStrata platform today.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-slate-400 font-medium bg-[#111827] px-3 py-1.5 rounded-lg border border-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            
            <button className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
            
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {pendingRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b0f19]"></div>
              )}
            </button>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* 1. KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            
            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Total Users</p>
                <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{users.length}</p>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Total Companies</p>
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{companies.length}</p>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Total Products</p>
                <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{products.length}</p>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Total Licenses</p>
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalLicenses}</p>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Active Licenses</p>
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stats.activeLicenses}</p>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold text-slate-400">Active Devices</p>
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
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
                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">View Full Analytics â†’</button>
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
                    <p className="text-sm font-bold">No pending unbind requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="p-4 bg-[#151d2e] border border-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-white mb-0.5">Device Name: <span className="font-medium text-slate-300">{req.device?.deviceName || req.deviceName || req.device?.machineId || `Device #${req.deviceId}`}</span></p>
                            <p className="text-[10px] text-slate-500">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 uppercase border border-orange-500/20">Pending</span>
                        </div>
                        <div className="bg-[#0b0f19] p-2.5 rounded border border-slate-800 mb-3">
                          <p className="text-[11px] text-slate-400 italic">"{req.reason}"</p>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded transition-colors">Approve</button>
                          <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded transition-colors">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 4. ACTIVITY & SYSTEM ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col min-h-[250px]">
              <h3 className="text-sm font-bold text-white mb-5">Recent Activity</h3>
              <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {usageLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6">
                    <p className="text-sm font-bold">No recent activity available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {usageLogs.slice(0, 10).map((log, i) => (
                      <div key={log.id || i} className="flex relative pl-6">
                        {/* Timeline dot and line */}
                        <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-[#111827] z-10"></div>
                        {i !== Math.min(usageLogs.length, 10) - 1 && <div className="absolute left-1 top-3 bottom-[-16px] w-px bg-slate-800"></div>}
                        
                        <div className="flex-1 ml-4">
                          <p className="text-xs font-medium text-white">{log.action || log.featuresUsed || 'System event recorded'}</p>
                          <div className="flex items-center mt-1 space-x-3 text-[10px] text-slate-500">
                            <span>{new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                            {(log.activationMethod || (log.featuresUsed && log.featuresUsed.includes('Offline') ? 'Offline' : log.featuresUsed && log.featuresUsed.includes('QR') ? 'QR' : null)) && (
                              <span>Method: {log.activationMethod || (log.featuresUsed && log.featuresUsed.includes('Offline') ? 'Offline' : 'QR')}</span>
                            )}
                            {log.ipAddress && log.ipAddress !== 'Offline Upload' && log.ipAddress !== 'QR Approval' && log.ipAddress !== 'System' && (
                              <span>IP: {log.ipAddress}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* System Health */}
            <div className="lg:col-span-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col">
              <h3 className="text-sm font-bold text-white mb-5">System Health</h3>
              <div className="space-y-4 flex-1">
                {systemHealth.map((health, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-[#151d2e] border border-slate-700/50">
                    <span className="text-xs font-medium text-slate-300">{health.service}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${health.status === 'Operational' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${health.status === 'Operational' ? 'text-emerald-500' : 'text-slate-500'}`}>{health.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 5. RECENT LICENSES TABLE */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-white">Recent Licenses Issued</h3>
              <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#0b0f19] text-slate-400 font-bold uppercase tracking-wider border-y border-slate-800">
                  <tr>
                    <th className="px-5 py-3">License Key</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Company/Buyer</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Issued At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sortedLicenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-slate-500 font-medium">No data available</td>
                    </tr>
                  ) : (
                    sortedLicenses.slice(0, 7).map(l => {
                      const keyMasked = l.licenseKey ? `LS-â€¢â€¢â€¢â€¢-â€¢â€¢â€¢â€¢-${l.licenseKey.slice(-4)}` : 'N/A';
                      const buyerName = l.user?.fullName || l.company?.name || 'Unknown';
                      const isBulk = l.user?.role === 'BULK_BUYER';
                      
                      return (
                        <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-slate-300">{keyMasked}</td>
                          <td className="px-5 py-3.5 text-slate-300 font-medium">{l.product?.name || l.productName || 'Software'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">{buyerName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${isBulk ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {isBulk ? 'Bulk Buyer' : 'Customer'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{l.licenseType || 'Volume'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${l.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : l.status === 'EXPIRED' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : l.status === 'REVOKED' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                              {l.status || 'INACTIVE'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{safeDate(l.issuedDate || l.createdAt)?.toLocaleDateString() || 'N/A'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. QUICK ACTIONS */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-white mb-5">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setActiveTab('users')} className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-[#151d2e] border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 rounded-lg transition-colors group">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white mr-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Add User</span>
              </button>
              <button onClick={() => setActiveTab('companies')} className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-[#151d2e] border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 rounded-lg transition-colors group">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white mr-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Add Company</span>
              </button>
              <button onClick={() => setActiveTab('products')} className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-[#151d2e] border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 rounded-lg transition-colors group">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white mr-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Add Product</span>
              </button>
              <button onClick={() => setActiveTab('licenses')} className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-[#151d2e] border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 rounded-lg transition-colors group">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white mr-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">View Licenses</span>
              </button>
              <button onClick={() => setActiveTab('activity-log')} className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-[#151d2e] border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 rounded-lg transition-colors group">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white mr-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">View Audit Logs</span>
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
