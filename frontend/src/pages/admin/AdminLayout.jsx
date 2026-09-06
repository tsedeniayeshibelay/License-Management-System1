import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import api from '../../services/api'

import AdminDashboardHome from './AdminDashboardHome'
import AdminUsers from './AdminUsers'
import AdminCompanies from './AdminCompanies'
import AdminProducts from './AdminProducts'
import AdminLicenses from './AdminLicenses'
import AdminLicenseTypes from './AdminLicenseTypes'
import AdminActivations from './AdminActivations'
import AdminDevices from './AdminDevices'
import AdminUnbindRequests from './AdminUnbindRequests'
import AdminAnalytics from './AdminAnalytics'
import AdminActivityLog from './AdminActivityLog'
import AdminSecurity from './AdminSecurity'
import AdminAlerts from './AdminAlerts'
import AdminSystemConfiguration from './AdminSystemConfiguration'
import AdminReports from './AdminReports'
import AdminSupport from './AdminSupport'
import AdminSettings from './AdminSettings'
import AdminProfile from './AdminProfile'
import NotificationBell from '../../components/NotificationBell'

export default function AdminLayout({ user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);

  // Sidebar expanded state initialized from localStorage
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/unbind-requests');
        setPendingRequests(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        // Ignore silently in layout
      }
    };
    const fetchConfig = async () => {
      try {
        const res = await api.get('/system/public-config');
        if (res.data) setIsMaintenanceActive(Boolean(res.data.maintenanceMode));
      } catch (err) {}
    };
    fetchPending();
    fetchConfig();
  }, []);

  // Sync sidebar preference with custom and storage events
  useEffect(() => {
    const handleSidebarChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      if (saved !== null) {
        setIsSidebarExpanded(saved === 'true');
      }
    };
    window.addEventListener('sidebar-changed', handleSidebarChange);
    window.addEventListener('storage', handleSidebarChange);
    return () => {
      window.removeEventListener('sidebar-changed', handleSidebarChange);
      window.removeEventListener('storage', handleSidebarChange);
    };
  }, []);

  // Load canonical backend preference if present on user
  useEffect(() => {
    if (user?.preferences) {
      try {
        const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
        if (typeof prefs.sidebarExpanded === 'boolean') {
          setIsSidebarExpanded(prefs.sidebarExpanded);
          localStorage.setItem('sidebarExpanded', String(prefs.sidebarExpanded));
        }
      } catch (e) {}
    }
  }, [user]);

  const toggleSidebar = () => {
    const nextVal = !isSidebarExpanded;
    setIsSidebarExpanded(nextVal);
    localStorage.setItem('sidebarExpanded', String(nextVal));
    window.dispatchEvent(new Event('sidebar-changed'));

    // Asynchronously sync with backend user profile preferences without blocking UI
    api.get('/users/profile').then(res => {
      let currentPrefs = {};
      try { currentPrefs = JSON.parse(res.data?.preferences || '{}'); } catch(e) {}
      const updatedPrefs = { ...currentPrefs, sidebarExpanded: nextVal };
      api.put('/users/profile', {
        fullName: res.data?.fullName,
        preferences: JSON.stringify(updatedPrefs)
      }).catch(() => {});
    }).catch(() => {});
  };

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getLinkClass = (path, title) => {
    const base = isSidebarExpanded
      ? 'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all'
      : 'w-full flex items-center justify-center px-0 py-2.5 rounded-lg transition-all';
    return isActive(path) 
      ? `${base} bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold`
      : `${base} text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50`;
  };
  
  const getSubLinkClass = (path, title) => {
    const base = isSidebarExpanded
      ? 'w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors'
      : 'w-full flex items-center justify-center px-0 py-2 rounded-lg transition-colors';
    return isActive(path) 
      ? `${base} bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold`
      : `${base} text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white flex font-sans selection:bg-indigo-500/30 transition-colors duration-200">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* FIXED SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${isSidebarExpanded ? 'w-[250px]' : 'w-[72px]'} bg-white dark:bg-[#070b14] border-r border-slate-200 dark:border-slate-800/60 flex-shrink-0 flex flex-col h-screen overflow-y-auto transition-all duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 !w-[250px]' : '-translate-x-full'} scrollbar-thin scrollbar-thumb-slate-800`}>
        
        {/* LOGO & BRAND HEADER */}
        {isSidebarExpanded ? (
          <div className="p-6 flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">LockStrata</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Enterprise License</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col items-center justify-center mb-2 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0" title="LockStrata">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <nav className="flex-1 px-3 pb-8 space-y-6">
          {/* MAIN */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Main</p>}
            <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} title="Dashboard" className={getLinkClass('/dashboard')}>
              <svg className={`w-4 h-4 shrink-0 ${isActive('/dashboard') ? 'text-indigo-600 dark:text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              {isSidebarExpanded && <span className="text-sm font-medium">Dashboard</span>}
            </Link>
          </div>

          {/* MANAGEMENT */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Management</p>}
            <div className="space-y-1">
              <Link to="/dashboard/users" onClick={() => setIsMobileMenuOpen(false)} title="Users" className={getSubLinkClass('/dashboard/users')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Users</span>}
              </Link>
              <Link to="/dashboard/companies" onClick={() => setIsMobileMenuOpen(false)} title="Companies" className={getSubLinkClass('/dashboard/companies')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Companies</span>}
              </Link>
              <Link to="/dashboard/products" onClick={() => setIsMobileMenuOpen(false)} title="Products" className={getSubLinkClass('/dashboard/products')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Products</span>}
              </Link>
            </div>
          </div>

          {/* LICENSING */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Licensing</p>}
            <div className="space-y-1">
              <Link to="/dashboard/licenses" onClick={() => setIsMobileMenuOpen(false)} title="Licenses" className={getSubLinkClass('/dashboard/licenses')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Licenses</span>}
              </Link>
            </div>
          </div>

          {/* OPERATIONS */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Operations</p>}
            <div className="space-y-1">
              <Link to="/dashboard/activations" onClick={() => setIsMobileMenuOpen(false)} title="Activations" className={getSubLinkClass('/dashboard/activations')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Activations</span>}
              </Link>
              <Link to="/dashboard/devices" onClick={() => setIsMobileMenuOpen(false)} title="Devices" className={getSubLinkClass('/dashboard/devices')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Devices</span>}
              </Link>
              <Link to="/dashboard/unbind-requests" onClick={() => setIsMobileMenuOpen(false)} title="Unbind Requests" className={`w-full flex items-center ${isSidebarExpanded ? 'justify-between px-3' : 'justify-center px-0'} py-2 rounded-lg transition-colors ${isActive('/dashboard/unbind-requests') ? 'bg-indigo-500/15 text-indigo-600 dark:text-white border border-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
                <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3' : 'relative'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                  {isSidebarExpanded && <span className="text-sm font-medium">Unbind Requests</span>}
                  {!isSidebarExpanded && pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500"></span>
                  )}
                </div>
                {isSidebarExpanded && pendingRequests.length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>
                )}
              </Link>
            </div>
          </div>

          {/* MONITORING */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Monitoring</p>}
            <div className="space-y-1">
              <Link to="/dashboard/analytics" onClick={() => setIsMobileMenuOpen(false)} title="Analytics" className={getSubLinkClass('/dashboard/analytics')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Analytics</span>}
              </Link>
              <Link to="/dashboard/activity-log" onClick={() => setIsMobileMenuOpen(false)} title="Activity Log" className={getSubLinkClass('/dashboard/activity-log')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Activity Log</span>}
              </Link>
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            {isSidebarExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">System</p>}
            <div className="space-y-1">
              <Link to="/dashboard/reports" onClick={() => setIsMobileMenuOpen(false)} title="Reports" className={getSubLinkClass('/dashboard/reports')}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {isSidebarExpanded && <span className="text-sm font-medium">Reports</span>}
              </Link>
            </div>
          </div>
        </nav>

        {/* BOTTOM USER PROFILE & ACCOUNT */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800/60 p-3 space-y-3">
          
          <Link to="/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)} title="Settings" className={getSubLinkClass('/dashboard/settings')}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {isSidebarExpanded && <span className="text-sm font-medium">Settings</span>}
          </Link>
          
          <Link to="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)} title={user.username} className={`flex items-center ${isSidebarExpanded ? 'space-x-3 p-2' : 'justify-center p-2'} bg-slate-100 dark:bg-[#151d2e] border ${isActive('/dashboard/profile') ? 'border-indigo-500/50 shadow-md' : 'border-slate-200 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-800'} rounded-xl transition-colors cursor-pointer`}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {isSidebarExpanded && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{user.username}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email || 'Super Administrator'}</p>
              </div>
            )}
          </Link>
          
          <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} title="Sign Out" className={`w-full flex items-center ${isSidebarExpanded ? 'justify-center space-x-2' : 'justify-center'} px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            {isSidebarExpanded && <span className="text-sm font-medium">Sign Out</span>}
          </button>
          
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0b0f19] transition-colors duration-200">
        
        {/* MAINTENANCE MODE ALERT BANNER */}
        {isMaintenanceActive && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-500 dark:text-amber-400 font-semibold shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Maintenance Mode is currently ACTIVE — customer & company API access is suspended.</span>
            </div>
            <Link to="/dashboard/settings" className="underline hover:text-amber-600 dark:hover:text-amber-300">
              Manage in Settings &rarr;
            </Link>
          </div>
        )}

        {/* HEADER */}
        <header className="h-20 flex items-center justify-between px-6 md:px-8 border-b border-slate-200 dark:border-slate-800/60 sticky top-0 bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-md z-10 shrink-0 transition-colors duration-200">
          <div className="flex items-center space-x-4">
            <button className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                {user?.loginCount === 1 ? 'Welcome' : 'Welcome back'}, {user.username.split(' ')[0]} <span className="ml-2 text-xl">👋</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">Here's what's happening across the LockStrata platform today.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="hidden lg:flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-[#111827] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            

            <NotificationBell />
          </div>
        </header>

        {/* ROUTES CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AdminDashboardHome user={user} />} />
            <Route path="users" element={<AdminUsers user={user} />} />
            <Route path="companies" element={<AdminCompanies user={user} />} />
            <Route path="products" element={<AdminProducts user={user} />} />
            <Route path="licenses" element={<AdminLicenses user={user} />} />
            <Route path="license-types" element={<AdminLicenseTypes user={user} />} />
            <Route path="activations" element={<AdminActivations user={user} />} />
            <Route path="devices" element={<AdminDevices user={user} />} />
            <Route path="unbind-requests" element={<AdminUnbindRequests user={user} />} />
            <Route path="analytics" element={<AdminAnalytics user={user} />} />
            <Route path="activity-log" element={<AdminActivityLog user={user} />} />
            <Route path="security" element={<AdminSecurity user={user} />} />
            <Route path="alerts" element={<AdminAlerts user={user} />} />
            <Route path="system-config" element={<AdminSystemConfiguration user={user} />} />
            <Route path="reports" element={<AdminReports user={user} />} />
            <Route path="support" element={<AdminSupport user={user} />} />
            <Route path="settings" element={<AdminSettings user={user} />} />
            <Route path="profile" element={<AdminProfile user={user} />} />
          </Routes>
        </main>

      </div>
    </div>
  );
}
