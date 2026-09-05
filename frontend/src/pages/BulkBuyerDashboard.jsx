import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { downloadInvoice } from '../utils/invoiceGenerator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function BulkBuyerDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalPurchased: 0,
    assigned: 0,
    available: 0,
    activated: 0,
    expiringSoon: 0,
    activeProducts: 0
  });
  const [activity, setActivity] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Dashboard Preferences (loaded from profile or local storage) ---
  const [preferences, setPreferences] = useState(() => {
    try {
      if (user?.preferences) {
        const parsed = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences
        if (parsed?.dashboardPrefs) return parsed.dashboardPrefs
      }
      const local = localStorage.getItem('bulkbuyer_preferences')
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
          const local = localStorage.getItem('bulkbuyer_preferences')
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
  const thPad = isCompact ? 'p-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider' : 'p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider'
  const tdPad = isCompact ? 'p-2 text-xs' : 'p-4 text-sm'
  const badgePad = isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  const btnPad = isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'

  // Dynamic Quick Actions
  const showQuickActions = preferences?.showQuickActions !== false
  const actionContainerClass = showQuickActions 
    ? "transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto" 
    : "opacity-100 pointer-events-auto"

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRenewLicenseId, setSelectedRenewLicenseId] = useState('');
  const [renewExpiryDate, setRenewExpiryDate] = useState('');
  const [selectedExtensionMonths, setSelectedExtensionMonths] = useState(12);
  const [renewLoading, setRenewLoading] = useState(false);
  const [products, setProducts] = useState([]);
  
  const [newEmployee, setNewEmployee] = useState({ username: '', email: '', password: '', fullName: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes, assignRes, empRes, licRes, prodRes] = await Promise.all([
        api.get('/bulk-buyer/dashboard'),
        api.get('/bulk-buyer/activity'),
        api.get('/bulk-buyer/assignments/recent'),
        api.get('/bulk-buyer/employees'),
        api.get('/licenses'),
        api.get('/products/public')
      ]);

      let fetchedStats = statsRes.data || {};
      let fetchedActivity = Array.isArray(activityRes.data) ? activityRes.data : [];
      let fetchedAssignments = Array.isArray(assignRes.data) ? assignRes.data : [];
      let fetchedEmployees = Array.isArray(empRes.data) ? empRes.data : [];
      let fetchedLicenses = Array.isArray(licRes.data) ? licRes.data : (Array.isArray(licRes.data?.content) ? licRes.data.content : []);
      let fetchedProducts = Array.isArray(prodRes.data) ? prodRes.data : [];

      // No mock data injected. We use the real backend data directly.
      setStats(fetchedStats);
      setActivity(fetchedActivity);
      setRecentAssignments(fetchedAssignments);
      setEmployees(fetchedEmployees);
      setLicenses(fetchedLicenses);
      setProducts(fetchedProducts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setError("Unable to load dashboard data. Please make sure the backend server is running with the latest updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateSecurePassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const specials = "@#$%^&+=!";
    const all = lower + upper + digits + specials;
    let password = [
      lower.charAt(Math.floor(Math.random() * lower.length)),
      upper.charAt(Math.floor(Math.random() * upper.length)),
      digits.charAt(Math.floor(Math.random() * digits.length)),
      specials.charAt(Math.floor(Math.random() * specials.length))
    ];
    for (let i = 4; i < 12; i++) {
      password.push(all.charAt(Math.floor(Math.random() * all.length)));
    }
    return password.sort(() => Math.random() - 0.5).join('');
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bulk-buyer/assignments/assign', {
        licenseId: parseInt(selectedLicenseId),
        employeeId: parseInt(selectedEmployeeId)
      });
      setShowAssignModal(false);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || (data?.errors ? Object.values(data.errors).join(', ') : null) || data?.error || err.message;
      alert("Error assigning license: " + msg);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bulk-buyer/employees', newEmployee);
      setShowAddEmployeeModal(false);
      const createdPassword = newEmployee.password;
      setNewEmployee({ username: '', email: '', password: '', fullName: '' });
      fetchData();
      alert("✅ Employee created successfully!\nTemporary password: " + createdPassword);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || (data?.errors ? Object.values(data.errors).join(', ') : null) || data?.error || err.message;
      alert("Error adding employee: " + msg);
    }
  };

  const handleRevoke = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to revoke this license?")) return;
    try {
      await api.post(`/bulk-buyer/assignments/${assignmentId}/revoke`);
      fetchData();
    } catch (err) {
      alert("Error revoking: " + err.message);
    }
  };

  const handleApprove = async (assignmentId) => {
    try {
      await api.post(`/bulk-buyer/assignments/${assignmentId}/approve`);
      fetchData();
      alert("✅ License assignment approved and activated!");
    } catch (err) {
      alert("Error approving assignment: " + (err.response?.data?.message || err.message));
    }
  };

  const calculateTargetExpiryDate = (lic, months) => {
    let base = new Date();
    if (lic && lic.expiryDate) {
      const parts = String(lic.expiryDate).split('T')[0].split('-');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(parsed.getTime()) && parsed > base) {
          base = parsed;
        }
      }
    }
    const target = new Date(base);
    target.setMonth(target.getMonth() + months);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSelectRenewLicense = (licId) => {
    setSelectedRenewLicenseId(licId);
    setSelectedExtensionMonths(12);
    const lic = licenses.find(l => l.id === parseInt(licId));
    if (lic) {
      setRenewExpiryDate(calculateTargetExpiryDate(lic, 12));
    } else {
      setRenewExpiryDate('');
    }
  };

  const handleApplyPresetDuration = (months) => {
    setSelectedExtensionMonths(months);
    const lic = licenses.find(l => l.id === parseInt(selectedRenewLicenseId));
    setRenewExpiryDate(calculateTargetExpiryDate(lic, months));
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRenewLicenseId) {
      alert("Please select a license to renew.");
      return;
    }
    if (!renewExpiryDate) {
      alert("Please select a new expiration date.");
      return;
    }
    try {
      setRenewLoading(true);
      const duration = selectedExtensionMonths || 12;
      const targetLic = licenses.find(l => String(l.id) === String(selectedRenewLicenseId));
      const targetProd = targetLic ? (targetLic.product || products.find(p => p.id === targetLic.productId)) : null;
      const prodName = targetProd?.name || targetLic?.productName || 'Software License';
      const unitPrice = Number(targetProd?.bulkBuyerPrice || targetProd?.customerPrice || targetProd?.price || 50);
      const seats = targetLic?.totalSeats || targetLic?.maxActivations || 1;
      const durationFactor = duration / 12.0;
      const renewalAmount = unitPrice * seats * durationFactor;

      await api.put(`/licenses/${selectedRenewLicenseId}/renew?newExpiryDate=${renewExpiryDate}&durationMonths=${duration}`);

      const generatedOrder = {
        orderNumber: `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        orderDate: new Date().toISOString(),
        productName: `${prodName} (Renewal - ${duration >= 12 ? `${duration / 12} Year${duration > 12 ? 's' : ''}` : `${duration} Months`})`,
        quantity: seats,
        amount: renewalAmount,
        status: 'COMPLETED'
      };

      setShowRenewModal(false);
      setSelectedRenewLicenseId('');
      setRenewExpiryDate('');
      fetchData();

      if (window.confirm("✅ Renewal payment confirmed! Your license has been extended.\n\nClick OK to download and print your official invoice now.")) {
        downloadInvoice(generatedOrder, user || JSON.parse(localStorage.getItem('user') || '{}'));
      }
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || (data?.errors ? Object.values(data.errors).join(', ') : null) || data?.error || err.message;
      alert("Error renewing license: " + msg);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleDownload = async (productId) => {
    try {
      const releaseRes = await api.get(`/releases/product/${productId}/latest`);
      const release = releaseRes.data;
      if (!release) {
        alert("No software release is currently available for this product.");
        return;
      }
      if (release.distributionMethod === 'EXTERNAL') {
        window.open(release.downloadUrl, '_blank');
      } else {
        const fileRes = await api.get(`/releases/${release.id}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([fileRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', release.originalFilename || 'download');
        document.body.appendChild(link);
        link.click();
      }
    } catch (err) {
      console.error("Failed to download", err);
      alert("Failed to download software. It may not be available.");
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col justify-center items-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Connection Error</h2>
        <p className="text-slate-500 max-w-md">{error}</p>
        <button onClick={fetchData} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Try Again</button>
      </div>
    );
  }

  // Chart Data Preparation
  const hasDonutData = (stats.assigned || 0) > 0 || (stats.available || 0) > 0 || (stats.expiringSoon || 0) > 0;
  const donutData = hasDonutData ? [
    { name: 'Assigned', value: stats.assigned || 0, color: '#3b82f6' },
    { name: 'Available', value: stats.available || 0, color: '#10b981' },
    { name: 'Expiring Soon', value: stats.expiringSoon || 0, color: '#f59e0b' },
  ] : [{ name: 'No Data', value: 1, color: '#cbd5e1' }];
  
  const pieData = hasDonutData ? donutData.filter(d => d.value > 0) : donutData;
  
  // Aggregate licenses by product name to show clear assigned vs available seats
  const productUtilizationData = Object.values(licenses.reduce((acc, lic) => {
    const prodName = lic.productName || lic.product?.name || (products.find(p => p.id === lic.productId)?.name) || `Product #${lic.productId}`;
    const total = lic.totalSeats || lic.maxActivations || 1;
    const used = lic.usedSeats || 0;
    const available = Math.max(0, total - used);
    
    if (!acc[prodName]) {
      acc[prodName] = {
        name: prodName,
        assigned: 0,
        available: 0,
        total: 0,
        productId: lic.productId,
      };
    }
    acc[prodName].assigned += used;
    acc[prodName].available += available;
    acc[prodName].total += total;
    acc[prodName].rate = acc[prodName].total > 0 ? Math.round((acc[prodName].assigned / acc[prodName].total) * 100) : 0;
    return acc;
  }, {}));

  const expiringLicenses = licenses.filter(l => {
      if (!l.expiryDate) return false;
      const diff = new Date(l.expiryDate) - new Date();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-10">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Good morning, {user.company || user.username} ðŸ‘‹
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Here's what's happening with your licenses today.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowAddEmployeeModal(true)}
            className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Add Employee</span>
          </button>
          
          <button 
            onClick={() => setShowAssignModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            <span>Assign License</span>
          </button>

          <button 
            onClick={() => {
              if (!licenses || licenses.length === 0) {
                alert("You currently have no licenses available to renew.");
                return;
              }
              const firstLic = String(licenses[0].id);
              handleSelectRenewLicense(firstLic);
              setShowRenewModal(true);
            }}
            className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span>Renew License</span>
          </button>
        </div>
      </div>

      {activeTab !== 'overview' && (
        <div className="flex items-center -mt-2 mb-2 animate-in slide-in-from-left-4 duration-300">
          <button onClick={() => setActiveTab('overview')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard Overview
          </button>
        </div>
      )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { id: 'pools', title: 'TOTAL LICENSES', value: stats.totalPurchased || 0, subtitle: 'Purchased Seats', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { id: 'assigned', title: 'ASSIGNED', value: stats.assigned || 0, subtitle: 'Assigned to employees', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { id: 'pools', title: 'AVAILABLE', value: stats.available || 0, subtitle: 'Ready to assign', color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
          { id: 'assigned', title: 'ACTIVATED', value: stats.activated || 0, subtitle: 'Active device seats', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { id: 'expiring', title: 'EXPIRING SOON', value: stats.expiringSoon || 0, subtitle: 'Needs attention', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { id: 'products', title: 'ACTIVE PRODUCTS', value: stats.activeProducts || 0, subtitle: 'Across organization', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((kpi, i) => (
          <div key={i} onClick={() => setActiveTab(kpi.id)} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border ${activeTab === kpi.id ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer hover:-translate-y-1 group`}>
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-500 tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{kpi.title}</p>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${kpi.bg}`}>
                <div className={`w-3 h-3 rounded-full ${kpi.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-3xl font-black tracking-tight ${kpi.color}`}>{kpi.value.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">{kpi.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. CHARTS ROW */}
      {(activeTab === 'overview' || activeTab === 'products') && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* PRODUCT SEAT ALLOCATION (Capacity Cards) */}
        <div className="lg:col-span-2 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3.5">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white">Seat Allocation by Product</h3>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold">
                  {productUtilizationData.length} {productUtilizationData.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Clear breakdown of assigned vs available seats across your software pools.</p>
            </div>
          </div>

          {productUtilizationData.length === 0 ? (
            <div className="h-44 w-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              <span>No active products owned yet</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {productUtilizationData.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.name}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      item.available === 0 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : item.available <= 2 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {item.available === 0 ? 'Full (0 available)' : `${item.available} available seats`}
                    </span>
                  </div>
                  
                  {/* Visual Segmented Progress */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-500" 
                      style={{ width: `${item.total > 0 ? (item.assigned / item.total) * 100 : 0}%` }}
                      title={`${item.assigned} Assigned`}
                    />
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${item.total > 0 ? (item.available / item.total) * 100 : 0}%` }}
                      title={`${item.available} Available`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[12px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span><strong className="text-slate-700 dark:text-slate-200">{item.assigned}</strong> of <strong className="text-slate-700 dark:text-slate-200">{item.total}</strong> seats assigned ({item.rate}% utilized)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const lic = licenses.find(l => l.productId === item.productId || (l.product && l.product.name === item.name));
                        if (lic) {
                          setSelectedLicenseId(String(lic.id));
                          setShowAssignModal(true);
                        }
                      }}
                      disabled={item.available === 0}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline disabled:opacity-40 disabled:hover:no-underline cursor-pointer flex items-center space-x-1"
                    >
                      <span>+ Assign Seat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-1.5 shrink-0"></span>Blue = Assigned to Staff</span>
              <span className="inline-flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>Green = Ready to Assign</span>
            </div>
          </div>
        </div>

        {/* LICENSE DISTRIBUTION DONUT */}
        <div className="min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 flex flex-col">
          <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white">License Distribution</h3>
          <div className="w-full h-[210px] relative mt-2">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={80}
                  paddingAngle={hasDonutData && pieData.length > 1 ? 4 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, name) => [`${value} seats`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalPurchased || 0}</span>
              <span className="text-xs text-slate-500 font-medium">Total Seats</span>
            </div>
          </div>
          <div className="mt-3 space-y-2.5">
            {donutData.map((entry, index) => (
              <div key={index} className="flex justify-between items-center text-xs md:text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
             <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span>Seat Utilization</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{stats.totalPurchased ? Math.round(((stats.assigned || 0) / stats.totalPurchased) * 100) : 0}%</span>
             </div>
             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.totalPurchased ? Math.min(100, Math.round(((stats.assigned || 0) / stats.totalPurchased) * 100)) : 0}%` }}
                />
             </div>
          </div>
        </div>
      </div>
      )}

      {/* 4. POOLS & EXPIRING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* LICENSE POOLS */}
        {(activeTab === 'overview' || activeTab === 'pools') && (
        <div className={`${activeTab === 'pools' ? 'lg:col-span-3' : 'lg:col-span-2'} min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Your License Pools</h3>
            {activeTab === 'overview' && (
              <button onClick={() => setActiveTab('pools')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            )}
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className={thPad}>Product</th>
                  <th className={thPad}>License Type</th>
                  <th className={thPad}>Seats (Used/Total)</th>
                  <th className={thPad}>Status</th>
                  <th className={`${thPad} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {licenses.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">No licenses purchased yet.</td></tr>
                )}
                {licenses.slice(0, activeTab === 'overview' ? 5 : undefined).map(lic => {
                  const used = lic.usedSeats || 0;
                  const total = lic.totalSeats || 1;
                  const percent = Math.min(100, (used / total) * 100);
                  return (
                  <tr key={lic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className={`${tdPad} font-medium text-slate-900 dark:text-white flex items-center space-x-3`}>
                      <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                      </div>
                      <span className="truncate">{lic.productName || (lic.product ? lic.product.name : `Product ${lic.productId}`)}</span>
                    </td>
                    <td className={`${tdPad} text-slate-600 dark:text-slate-400`}>
                      {lic.licenseType || 'Volume'}
                    </td>
                    <td className={tdPad}>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12">{used} / {total}</span>
                        <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${percent >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className={tdPad}>
                      <span className={`inline-flex items-center ${badgePad} rounded font-bold ${lic.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className={`${tdPad} text-right`}>
                      <div className={`inline-flex items-center justify-end ${actionContainerClass}`}>
                        {(lic.status === 'ACTIVE' || lic.status === 'NOT_ACTIVATED') && (
                          <button 
                            onClick={() => handleDownload(lic.productId)}
                            className={`text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/20 ${btnPad} rounded-lg border border-blue-200 dark:border-blue-800/50 transition-colors cursor-pointer`}
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* EXPIRING SOON */}
        {(activeTab === 'overview' || activeTab === 'expiring') && (
        <div className={`${activeTab === 'expiring' ? 'lg:col-span-3' : 'min-w-0'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75`}>
           <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Expiring Soon</h3>
            {activeTab === 'overview' && (
              <button onClick={() => setActiveTab('expiring')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            )}
          </div>
          <div className="space-y-4 flex-1">
            {expiringLicenses.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No licenses expiring in the next 30 days.</p>
            ) : (
              expiringLicenses.map(lic => {
                const daysLeft = Math.ceil((new Date(lic.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                <div key={lic.id} className="flex justify-between items-center p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{lic.product?.name || `Product ${lic.productId}`}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lic.totalSeats} seats â€¢ Exp: {new Date(lic.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex items-center space-x-2.5">
                    <span className="text-amber-600 font-bold text-sm whitespace-nowrap">{daysLeft} days</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectRenewLicense(String(lic.id));
                        setShowRenewModal(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm transition-colors cursor-pointer"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              )})
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs text-slate-500 font-medium">{expiringLicenses.length} licenses will expire within 30 days</span>
          </div>
        </div>
        )}
      </div>

      {/* 5. ASSIGNMENTS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* RECENT ASSIGNMENTS */}
        {(activeTab === 'overview' || activeTab === 'assigned') && (
        <div className={`${activeTab === 'assigned' ? 'lg:col-span-3' : 'lg:col-span-2'} min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Assignments</h3>
            {activeTab === 'overview' && (
              <button onClick={() => setActiveTab('assigned')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className={thPad}>Employee</th>
                  <th className={thPad}>Product</th>
                  <th className={thPad}>Assigned On</th>
                  <th className={thPad}>Status</th>
                  <th className={`${thPad} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentAssignments.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">No recent assignments found.</td></tr>
                )}
                {recentAssignments.slice(0, activeTab === 'overview' ? 5 : undefined).map(assign => (
                  <tr key={assign.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className={`${tdPad} font-bold text-slate-900 dark:text-white flex items-center space-x-3`}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 font-bold uppercase shrink-0">
                        {assign.user?.fullName?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate">{assign.user?.fullName}</span>
                    </td>
                    <td className={`${tdPad} text-slate-600 dark:text-slate-400`}>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{assign.license?.product?.name || `Prod #${assign.license?.productId}`}</div>
                    </td>
                    <td className={`${tdPad} text-slate-500`}>
                      {new Date(assign.assignedAt).toLocaleDateString()}
                    </td>
                    <td className={tdPad}>
                      <span className={`inline-flex items-center ${badgePad} rounded font-bold ${
                        assign.status === 'ACTIVE' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' 
                          : assign.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                      }`}>
                        {assign.status === 'PENDING_APPROVAL' ? 'Pending Approval' : assign.status}
                      </span>
                    </td>
                    <td className={`${tdPad} text-right`}>
                      <div className={`inline-flex items-center justify-end space-x-2 ${actionContainerClass}`}>
                        {assign.status === 'PENDING_APPROVAL' && (
                          <>
                            <button 
                              onClick={() => handleApprove(assign.id)}
                              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm transition-colors cursor-pointer ${btnPad}`}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRevoke(assign.id)}
                              className={`text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer ${btnPad}`}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {assign.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleRevoke(assign.id)}
                            className={`text-red-600 hover:text-red-800 font-medium transition-colors cursor-pointer ${btnPad}`}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* RECENT ACTIVITY */}
        {(activeTab === 'overview' || activeTab === 'activity') && (
        <div className={`${activeTab === 'activity' ? 'lg:col-span-3' : 'min-w-0'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Activity Feed</h3>
            {activeTab === 'overview' && (
              <button onClick={() => setActiveTab('activity')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            )}
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent flex-1 overflow-y-auto">
            {activity.length === 0 && <p className="text-sm text-slate-500 pl-8">No recent activity.</p>}
            {activity.slice(0, activeTab === 'overview' ? 5 : undefined).map((log, idx) => (
              <div key={idx} className="relative flex items-start space-x-3 mb-6">
                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${log.action.includes('REVOKE') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {log.action.includes('EMPLOYEE') ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  ) : log.action.includes('REVOKE') ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{log.action.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* MODALS */}
      {/* Assign License Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Assign License to Employee</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select License</label>
                <select 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"
                  value={selectedLicenseId}
                  onChange={(e) => setSelectedLicenseId(e.target.value)}
                >
                  <option value="">-- Choose a license --</option>
                  {licenses.length === 0 && (
                    <option value="" disabled>No licenses owned. Please purchase volume licenses from Catalog.</option>
                  )}
                  {licenses.filter(l => {
                    const status = (l.status || '').toUpperCase();
                    const isValidStatus = status === 'ACTIVE' || status === 'NOT_ACTIVATED' || status === '';
                    const total = l.totalSeats || l.maxActivations || 1;
                    const used = l.usedSeats || 0;
                    return isValidStatus && (used < total);
                  }).map(l => {
                    const total = l.totalSeats || l.maxActivations || 1;
                    const used = l.usedSeats || 0;
                    const available = total - used;
                    const name = l.productName || l.product?.name || `License #${l.id}`;
                    return (
                      <option key={l.id} value={l.id}>{name} ({used}/{total} used — {available} available)</option>
                    );
                  })}
                  {licenses.length > 0 && licenses.filter(l => {
                    const status = (l.status || '').toUpperCase();
                    const isValidStatus = status === 'ACTIVE' || status === 'NOT_ACTIVATED' || status === '';
                    const total = l.totalSeats || l.maxActivations || 1;
                    const used = l.usedSeats || 0;
                    return isValidStatus && (used < total);
                  }).length === 0 && (
                    <option value="" disabled>All seats across your licenses are currently assigned.</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Select Employee</label>
                <select 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">-- Choose an employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md">Assign License</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Employee</h3>
            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5" value={newEmployee.fullName} onChange={e => setNewEmployee({...newEmployee, fullName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Temporary Password</label>
                  <button 
                    type="button" 
                    onClick={() => setNewEmployee(prev => ({ ...prev, password: generateSecurePassword() }))}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                  >
                    🎲 Generate Strong
                  </button>
                </div>
                <input 
                  required 
                  type="text" 
                  minLength="8" 
                  placeholder="e.g. TempPass123!" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-mono text-sm" 
                  value={newEmployee.password} 
                  onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} 
                />
                <p className="text-[11px] text-slate-400 mt-1">Must be at least 8 chars with uppercase, lowercase, number & symbol (@#$%^&+=!).</p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew License Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header (Sticky Top) */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Renew Software License</h3>
                  <p className="text-xs text-slate-500">Choose a product license pool to extend its validity.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form with Scrollable Content and Sticky Footer */}
            <form onSubmit={handleRenewSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              
              {/* Scrollable Middle Container */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Select License</label>
                  <select 
                    required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    value={selectedRenewLicenseId} 
                    onChange={e => handleSelectRenewLicense(e.target.value)}
                  >
                    <option value="">Choose license to renew...</option>
                    {licenses.map(lic => {
                      const prodName = lic.productName || lic.product?.name || 'Software Product';
                      const seats = lic.totalSeats || 1;
                      const exp = lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : 'Perpetual';
                      return (
                        <option key={lic.id} value={lic.id}>
                          {prodName} ({seats} seats) — Expires: {exp} [{lic.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedRenewLicenseId && (() => {
                  const activeLic = licenses.find(l => l.id === parseInt(selectedRenewLicenseId));
                  const currentExpiry = activeLic?.expiryDate ? new Date(activeLic.expiryDate).toLocaleDateString() : 'None';
                  const activeProd = products.find(p => p.id === activeLic?.productId);
                  const seatCount = activeLic?.totalSeats || activeLic?.maxActivations || 1;
                  const unitPrice = activeProd ? Number(activeProd.bulkBuyerPrice || activeProd.price || 0) : 0;
                  const durationMonths = selectedExtensionMonths || 12;
                  const durationYears = durationMonths / 12;
                  const totalCost = unitPrice * seatCount * durationYears;

                  return (
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Product:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{activeLic?.productName || activeLic?.product?.name || activeProd?.name || 'Software Product'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Current Expiration:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{currentExpiry}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Seats:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{seatCount} seats ({activeLic?.usedSeats || 0} assigned)</span>
                        </div>
                      </div>

                      {/* Pricing & Invoice Breakdown */}
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 text-xs space-y-2">
                        <div className="flex justify-between items-center pb-1 border-b border-emerald-200/50 dark:border-emerald-800/40">
                          <span className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
                            Renewal Pricing & Billing
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded">Invoice Generated</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Rate per seat:</span>
                          <span className="font-bold text-slate-900 dark:text-white">${unitPrice.toFixed(2)} / year</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Seats in Pool:</span>
                          <span className="font-bold text-slate-900 dark:text-white">× {seatCount} seats</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Renewal Duration:</span>
                          <span className="font-bold text-slate-900 dark:text-white">× {durationMonths >= 12 ? `${durationMonths / 12} Year${durationMonths > 12 ? 's' : ''}` : `${durationMonths} Months`}</span>
                        </div>
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex justify-between items-baseline">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">Total Amount Due:</span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Quick Extensions</label>
                    <span className="text-[11px] text-slate-400">1-click duration preset</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '+6 Mo', months: 6, desc: '6 Months' },
                      { label: '+1 Year', months: 12, desc: '1 Year' },
                      { label: '+2 Years', months: 24, desc: '2 Years' },
                      { label: '+3 Years', months: 36, desc: '3 Years' },
                    ].map(preset => {
                      const isSelected = selectedExtensionMonths === preset.months;
                      return (
                        <button 
                          key={preset.months}
                          type="button" 
                          onClick={() => handleApplyPresetDuration(preset.months)}
                          className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                            isSelected 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30 font-extrabold scale-[1.02]' 
                              : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="text-sm">{preset.label}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-100 font-semibold' : 'text-slate-400'}`}>{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedRenewLicenseId && renewExpiryDate && (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>
                          {selectedExtensionMonths 
                            ? `Preset Applied: +${selectedExtensionMonths >= 12 ? `${selectedExtensionMonths / 12} Year${selectedExtensionMonths > 12 ? 's' : ''}` : `${selectedExtensionMonths} Months`}`
                            : 'Custom Expiration Date Selected'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                        Calculated
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      New Expiration: <strong className="text-slate-900 dark:text-white">{renewExpiryDate}</strong> (Click <em>Pay & Renew</em> below to apply)
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">New Expiration Date</label>
                  <input 
                    required 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500" 
                    value={renewExpiryDate} 
                    onChange={e => {
                      setRenewExpiryDate(e.target.value);
                      setSelectedExtensionMonths(null);
                    }} 
                  />
                  <p className="text-[11px] text-slate-400 mt-1">You can also customize the date manually using the date picker above.</p>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowRenewModal(false)} 
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={renewLoading || !selectedRenewLicenseId || !renewExpiryDate}
                  className="px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-50 cursor-pointer flex items-center"
                >
                  {renewLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Processing Payment...
                    </>
                  ) : (() => {
                    const activeLic = licenses.find(l => l.id === parseInt(selectedRenewLicenseId));
                    const activeProd = products.find(p => p.id === activeLic?.productId);
                    const seatCount = activeLic?.totalSeats || activeLic?.maxActivations || 1;
                    const unitPrice = activeProd ? Number(activeProd.bulkBuyerPrice || activeProd.price || 0) : 0;
                    const durationMonths = selectedExtensionMonths || 12;
                    const totalCost = unitPrice * seatCount * (durationMonths / 12);
                    return totalCost > 0 ? `💳 Pay $${totalCost.toFixed(2)} & Renew` : 'Confirm Renewal';
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default BulkBuyerDashboard;
