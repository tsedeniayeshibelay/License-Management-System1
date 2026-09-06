import { useState, useEffect, useContext } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../services/api'
import { AuthContext } from '../context/AuthContext'
import CustomerDashboard from './CustomerDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import AdminLayout from './admin/AdminLayout'
import CompanyDashboard from './CompanyDashboard'
import BulkBuyerDashboard from './BulkBuyerDashboard'
import BulkBuyerEmployees from './BulkBuyerEmployees'
import BulkBuyerLicenses from './BulkBuyerLicenses'
import BulkBuyerActivity from './BulkBuyerActivity'
import BulkBuyerOrders from './BulkBuyerOrders'
import BulkBuyerAnalytics from './BulkBuyerAnalytics'
import ProductCatalog from './ProductCatalog'
import ErrorBoundary from '../components/ErrorBoundary'
import NotificationBell from '../components/NotificationBell'
import { ContactSupportModal } from '../components/SupportModals'

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const { user, logout, loading: authLoading } = useContext(AuthContext)
  const [licenses, setLicenses] = useState([])
  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, expiring: 0 })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const isEmployee = user?.role === 'CUSTOMER' && Boolean(user?.companyId)

  const getUserInitials = (u) => {
    const name = u?.fullName || u?.username || u?.email || 'User'
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  }

  // Fetch Dashboard Data
  const fetchData = async () => {
    if (!user) return
    try {
      // CUSTOMER: use /my-licenses which includes directly owned + assigned licenses
      // BULK_BUYER: use /licenses which returns their purchased license pool
      const licenseEndpoint = user.role === 'CUSTOMER' ? '/licenses/my-licenses' : '/licenses'
      const [licRes, devRes] = await Promise.all([
        api.get(licenseEndpoint).catch(() => ({ data: [] })),
        api.get('/devices/my-devices').catch(() => ({ data: [] }))
      ])
      
      const licenseList = Array.isArray(licRes.data) ? licRes.data : (Array.isArray(licRes.data?.content) ? licRes.data.content : [])
      setLicenses(licenseList)
      
      const deviceList = Array.isArray(devRes.data) ? devRes.data : (Array.isArray(devRes.data?.content) ? devRes.data.content : [])
      setDevices(deviceList)

      const now = new Date()
      let active = 0, expired = 0, expiring = 0
      
      licenseList.forEach(l => {
        if (l.status === 'EXPIRED' || (l.expiryDate && new Date(l.expiryDate) < now)) {
           expired++
        } else if (l.status === 'ACTIVE') {
           active++
           if (l.expiryDate) {
             const diff = new Date(l.expiryDate) - now
             if (diff > 0 && diff < 30 * 24 * 60 * 60 * 1000) {
                 expiring++
             }
           }
        }
      })
      setStats({ total: licenseList.length, active, expired, expiring })
      
    } catch (err) {
      console.error("Failed to fetch dashboard data", err)
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])


  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  if (authLoading || isDataLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If the user is an ADMIN, delegate the entire layout to AdminLayout
  if (user.role === 'ADMIN') {
    return (
      <ErrorBoundary>
        <AdminLayout user={user} />
      </ErrorBoundary>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex font-sans">
      
      {/* SIDEBAR */}
      {user.role === 'BULK_BUYER' ? (
        <>
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Branding */}
            <div className="p-6 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">LockStrata</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              
              {/* MAIN */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">MAIN</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    <span className="text-sm">Dashboard</span>
                  </button>
                  <button onClick={() => { setActiveTab('employees'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'employees' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <span className="text-sm">Employees</span>
                  </button>
                  <button onClick={() => { setActiveTab('licenses'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'licenses' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    <span className="text-sm">Licenses</span>
                  </button>
                </div>
              </div>

              {/* MARKETPLACE */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">MARKETPLACE</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('catalog'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'catalog' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    <span className="text-sm">Product Catalog</span>
                  </button>
                  <button onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span className="text-sm">Orders & Purchases</span>
                  </button>
                </div>
              </div>

              {/* MANAGEMENT */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">MANAGEMENT</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <span className="text-sm">Usage & Analytics</span>
                  </button>
                  <button onClick={() => { setActiveTab('activity'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'activity' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    <span className="text-sm">Activity</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

              {/* FOOTER NAV */}
              <div className="space-y-1">
                <button onClick={() => { setIsSupportModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                  <span className="text-sm">Support</span>
                </button>
                <Link to="/settings" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <span className="text-sm">Settings</span>
                </Link>
              </div>

            </nav>

            {/* Profile Bottom */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto space-y-3">
              <Link to="/settings" state={{ activeTab: 'Profile' }} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer w-full`}>
                <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white flex-shrink-0 flex items-center justify-center text-white dark:text-slate-900 font-bold text-sm shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                  {getUserInitials(user)}
                </div>
                <div className="overflow-hidden text-left flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{user.fullName || user.username || 'User'}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email || 'bulkbuyer@example.com'}</p>
                </div>
              </Link>
              
              <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border border-transparent">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      ) : user.role === 'CUSTOMER' ? (
        <>
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-[#0a0f1c] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Branding */}
            <div className="p-6 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(5,150,105,0.4)]">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">LockStrata</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              
              {/* DASHBOARD SECTIONS */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Control Center</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('customer-tab-change', { detail: 'overview' })); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/30 text-cyan-700 dark:text-cyan-400 font-medium shadow-[0_0_10px_rgba(34,211,238,0.05)]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    <span className="text-sm">Dashboard</span>
                  </button>
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('customer-tab-change', { detail: 'licenses' })); setTimeout(() => document.getElementById('my-licenses')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    <span className="text-sm">My Licenses</span>
                  </button>
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('customer-tab-change', { detail: 'devices' })); setTimeout(() => document.getElementById('activated-devices')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <span className="text-sm">Activated Devices</span>
                  </button>

                  {!isEmployee && (
                    <>
                      <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); setTimeout(() => document.getElementById('unbind-requests')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        <span className="text-sm">Unbind Requests</span>
                      </button>

                      <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('customer-tab-change', { detail: 'orders' })); setTimeout(() => document.getElementById('orders-invoices')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span className="text-sm">Orders & Invoices</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* MARKETPLACE - Only for direct retail customers */}
              {!isEmployee && (
                <div>
                  <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Marketplace</p>
                  <div className="space-y-1">
                    <button onClick={() => { setActiveTab('catalog'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'catalog' ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/30 text-cyan-700 dark:text-cyan-400 font-medium shadow-[0_0_10px_rgba(34,211,238,0.05)]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      <span className="text-sm">Product Catalog</span>
                    </button>
                  </div>
                </div>
              )}
            </nav>

            {/* Divider */}
            <div className="h-px bg-slate-200 dark:bg-slate-800/50 my-2 mx-4"></div>

            <div className="px-4 pb-4 mt-auto space-y-4">
              <Link to="/settings" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm font-medium">Settings</span>
              </Link>
              
              <div className="group relative w-full">
                <Link to="/settings" state={{ activeTab: 'Profile' }} onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
                      {getUserInitials(user)}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.fullName || user.username || 'User'}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">{user.email || 'customer@example.com'}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </Link>
              </div>

              <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors font-medium text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      ) : user.role === 'COMPANY' ? (
        <>
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#111827] border-r border-slate-800 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Branding */}
            <div className="p-6 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <div>
                 <h1 className="text-xl font-bold text-white tracking-tight leading-tight">LockStrata</h1>
                 <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise License Mgmt</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
              
              {/* MAIN */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Main</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    <span className="text-sm">Dashboard</span>
                  </button>
                </div>
              </div>

              {/* PRODUCTS */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Products</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-products'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-products' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    <span className="text-sm">Products</span>
                  </button>
                </div>
              </div>

              {/* LICENSING */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Licensing</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-licenses'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-licenses' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    <span className="text-sm">Licenses</span>
                  </button>
                  <button onClick={() => { setActiveTab('company-licenses-rules'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-licenses-rules' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span className="text-sm">License Types & Rules</span>
                  </button>
                </div>
              </div>

              {/* BUYERS */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Buyers</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-buyers'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-buyers' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span className="text-sm">License Holders</span>
                  </button>
                </div>
              </div>

              {/* ACTIVATIONS */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Activations</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-activations'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-activations' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    <span className="text-sm">Manage Activations</span>
                  </button>
                </div>
              </div>

              {/* ANALYTICS */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Analytics</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-analytics' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <span className="text-sm">Analytics</span>
                  </button>
                </div>
              </div>

              {/* ACTIVITY */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Activity</p>
                <div className="space-y-1">
                  <button onClick={() => { setActiveTab('company-activity'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'company-activity' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-sm">Activity Log</span>
                  </button>
                </div>
              </div>

              {/* SUPPORT */}
              <div>
                <p className="px-3 text-xs font-semibold text-slate-500 tracking-wider mb-2 uppercase">Support</p>
                <div className="space-y-1">
                  <button onClick={() => { setIsSupportModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    <span className="text-sm">Support</span>
                  </button>
                </div>
              </div>
            </nav>

            {/* Divider */}
            <div className="h-px bg-slate-800/50 my-2 mx-4"></div>

            {/* Bottom Actions */}
            <div className="px-4 pb-4 mt-auto space-y-4">
              <Link to="/settings" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm font-medium">Settings</span>
              </Link>
              
              <div className="group relative w-full">
                <Link to="/settings" state={{ activeTab: 'Profile' }} onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
                      {getUserInitials(user)}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <p className="text-sm font-bold text-white truncate">{user.fullName || user.username || 'User'}</p>
                      <p className="text-[10px] text-indigo-300 font-medium truncate">{user.email || 'company@example.com'}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </Link>
              </div>

              <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors font-medium text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      ) : (
        <aside className="w-64 bg-[#EAF1F8] dark:bg-slate-900 flex flex-col transition-colors duration-300 flex-shrink-0 hidden md:flex">
          {/* Branding */}
          <div className="p-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">LockStrata</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enterprise License Mgmt</p>
          </div>
  
          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-[#0f52ba] text-white font-medium shadow-md shadow-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span className="text-sm">Dashboard</span>
            </button>
            
            {user.role === 'ADMIN' && (
              <>
                <button onClick={() => setActiveTab('dashboard')} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  <span className="text-sm">Manage Users</span>
                </button>
                <button onClick={() => setActiveTab('dashboard')} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <span className="text-sm">Companies</span>
                </button>
              </>
            )}
  
            <button onClick={() => { setIsSupportModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              <span className="text-sm">Support</span>
            </button>
          </nav>
  
          {/* Bottom Actions */}
          <div className="p-4 space-y-4 mt-auto">
            <div className="space-y-1">
              <Link to="/settings" className="flex items-center space-x-3 px-4 py-2 w-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm font-medium">Settings</span>
              </Link>
              <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-2 w-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950`}>
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-950 z-10 sticky top-0">
          
          <div className="flex items-center space-x-4 w-full md:w-auto">
            {/* Hamburger (Mobile Only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>

            {/* Search */}
            <div className={`relative ${user.role === 'BULK_BUYER' ? 'w-full md:w-96' : 'w-96 hidden sm:block'}`}>
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right Topbar Icons */}
          <div className="flex items-center space-x-6 flex-shrink-0 ml-auto md:ml-0">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <ErrorBoundary>
            {user?.role === 'BULK_BUYER' ? (
              <>
                {activeTab === 'dashboard' && <BulkBuyerDashboard user={user} />}
                {activeTab === 'employees' && <BulkBuyerEmployees />}
                {activeTab === 'licenses' && <BulkBuyerLicenses />}
                {activeTab === 'orders' && <BulkBuyerOrders user={user} />}
                {activeTab === 'activity' && <BulkBuyerActivity />}
                {activeTab === 'analytics' && <BulkBuyerAnalytics />}
                {activeTab === 'catalog' && <ProductCatalog isInternal={true} userRole={user?.role} onNavigate={setActiveTab} />}
              </>
            ) : user?.role === 'CUSTOMER' ? (
              <>
                {isEmployee ? (
                  <EmployeeDashboard 
                    user={user} 
                    licenses={Array.isArray(licenses) ? licenses : []} 
                    devices={Array.isArray(devices) ? devices : []} 
                    onRefresh={fetchData} 
                  />
                ) : activeTab === 'catalog' ? (
                  <ProductCatalog isInternal={true} userRole={user?.role} onNavigate={setActiveTab} />
                ) : (
                  <CustomerDashboard user={user} stats={stats} licenses={Array.isArray(licenses) ? licenses : []} devices={Array.isArray(devices) ? devices : []} />
                )}
              </>
            ) : user?.role === 'COMPANY' ? (
              <CompanyDashboard user={user} stats={stats} licenses={Array.isArray(licenses) ? licenses : []} devices={Array.isArray(devices) ? devices : []} activeTab={activeTab} setActiveTab={setActiveTab} />
            ) : (
              <CustomerDashboard user={user} stats={stats} licenses={Array.isArray(licenses) ? licenses : []} devices={Array.isArray(devices) ? devices : []} />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* SUPPORT MODAL */}
      <ContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  )
}

export default Dashboard
