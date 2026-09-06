import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../services/api'

import CompanyProducts from '../components/company/CompanyProducts'
import CompanyLicenses from '../components/company/CompanyLicenses'
import CompanyBuyers from '../components/company/CompanyBuyers'
import CompanyActivations from '../components/company/CompanyActivations'
import CompanyActivityLog from '../components/company/CompanyActivityLog'
import CompanyLicenseRules from '../components/company/CompanyLicenseRules'
import CompanyAnalytics from '../components/company/CompanyAnalytics'

// Helper to safely parse dates (handles both ISO strings and Spring Boot LocalDateTime arrays)
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

// Colors for the donut chart
const STATUS_COLORS = {
  ACTIVE: '#10b981', // Emerald
  EXPIRED: '#f59e0b', // Orange/Amber
  REVOKED: '#ef4444', // Red
  INACTIVE: '#94a3b8', // Slate
  NOT_ACTIVATED: '#94a3b8'
};

function CompanyDashboard({ user, stats: adminStats, licenses = [], devices = [], activeTab, setActiveTab }) {
  const [products, setProducts] = useState([])
  const [activity, setActivity] = useState([])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []))
    } catch (err) {
      console.error("Failed to fetch products", err)
    }
  }

  useEffect(() => {
    fetchProducts()
    api.get('/companies/my-activity')
      .then(res => setActivity(Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : [])))
      .catch(err => console.error("Failed to fetch activity", err))
  }, [])


  const handleExportCSV = async () => {
    try {
      const response = await api.get('/licenses/export/csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'company_licenses.csv')
      document.body.appendChild(link)
      link.click()
    } catch (err) {
      console.error("Failed to export CSV", err)
    }
  }

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/licenses/export/pdf', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'company_licenses.pdf')
      document.body.appendChild(link)
      link.click()
    } catch (err) {
      console.error("Failed to export PDF", err)
    }
  }

  // Exact metrics calculations from real data
  const totalProducts = products.length;
  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter(l => l.status === 'ACTIVE').length;

  // Real Used Seats sum (activations placeholder for Company)
  const totalActivations = licenses.reduce((sum, l) => sum + (l.usedSeats || 0), 0);

  // Real expiring soon logic
  const expiringSoonLicenses = licenses.filter(l => {
    const d = safeDate(l.expiryDate);
    if (!d) return false;
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff <= (30 * 24 * 60 * 60 * 1000);
  });

  const uniqueHolders = new Set(licenses.map(l => l.user?.id || l.company?.id).filter(Boolean)).size;

  // Real Analytics Chart Data
  const activityData = useMemo(() => {
    if (!licenses || licenses.length === 0) return [];

    const counts = {};
    licenses.forEach(l => {
      const d = safeDate(l.issuedDate || l.createdAt);
      if (d) {
        // Group by day for the chart
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!counts[key]) counts[key] = { name: key, LicensesIssued: 0, Activations: 0, Revocations: 0 };
        counts[key].LicensesIssued++;
        if (l.status === 'REVOKED') counts[key].Revocations++;
        counts[key].Activations += (l.usedSeats || 0); // Using usedSeats as a proxy since Company usageLogs endpoint is restricted
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

  const hasActivityData = activityData.length > 0;

  // Status Donut calculation
  const statusData = useMemo(() => {
    const counts = {};
    licenses.forEach(l => {
      let status = l.status || 'INACTIVE';
      if (status === 'NOT_ACTIVATED') status = 'INACTIVE';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key.charAt(0) + key.slice(1).toLowerCase(),
      value: counts[key],
      color: STATUS_COLORS[key] || STATUS_COLORS.INACTIVE
    })).filter(item => item.value > 0);
  }, [licenses]);

  // Sorting recent licenses by date (newest first)
  const sortedLicenses = [...licenses].sort((a, b) => {
    const da = safeDate(a.issuedDate || a.createdAt)?.getTime() || 0;
    const db = safeDate(b.issuedDate || b.createdAt)?.getTime() || 0;
    return db - da;
  });

  // Conditional Rendering
  if (activeTab === 'company-products') {
    return <CompanyProducts products={products} fetchProducts={fetchProducts} />
  }

  if (activeTab === 'company-licenses') {
    return <CompanyLicenses licenses={licenses} products={products} fetchProducts={fetchProducts} />
  }

  if (activeTab === 'company-licenses-rules') {
    return <CompanyLicenseRules products={products} setActiveTab={setActiveTab} />
  }

  if (activeTab === 'company-buyers') {
    return <CompanyBuyers licenses={licenses} />
  }

  if (activeTab === 'company-activations') {
    return <CompanyActivations devices={devices} licenses={licenses} />
  }

  if (activeTab === 'company-activity') {
    return <CompanyActivityLog />
  }

  if (activeTab === 'company-analytics') {
    return <CompanyAnalytics licenses={licenses} products={products} />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">

      {/* HEADER SECTION (Top Right Controls included here for easy placement) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2 pt-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            {user?.loginCount === 1 ? 'Welcome' : 'Welcome back'}, {user.company || user.username} <span className="ml-2 text-xl">👋</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening with your products and licenses today.
          </p>
        </div>

        {/* Top Right Controls from Mockup */}
        <div className="flex flex-col items-end space-y-4">

        </div>
      </div>

      {/* KPI CARDS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        <div
          onClick={() => setActiveTab('company-products')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Products</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{totalProducts}</p>
        </div>
        <div
          onClick={() => setActiveTab('company-licenses')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Licenses Issued</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{totalLicenses}</p>
        </div>
        <div
          onClick={() => setActiveTab('company-licenses')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Active Licenses</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeLicenses}</p>
          {totalLicenses > 0 && (
            <p className="text-[10px] font-medium text-slate-400 mt-1">{((activeLicenses / totalLicenses) * 100).toFixed(1)}% of total</p>
          )}
        </div>

        <div
          onClick={() => setActiveTab('company-activations')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Activations</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{totalActivations}</p>
        </div>
        <div
          onClick={() => setActiveTab('company-licenses')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Expiring Soon</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{expiringSoonLicenses.length}</p>
          <p className="text-[10px] font-medium text-slate-400 mt-1">Within 30 days</p>
        </div>

        <div
          onClick={() => setActiveTab('company-buyers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Buyers</p>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{uniqueHolders}</p>
        </div>
      </div>


      {/* Licenses Expiring Soon */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Licenses Expiring Soon</h3>
          <button onClick={() => setActiveTab('company-licenses')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
        </div>

        <div className="flex-1">
          {expiringSoonLicenses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-4">
              <svg className="w-10 h-10 mb-2 text-slate-200 dark:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-sm font-bold text-slate-500">All licenses are up to date</p>
              <p className="text-xs mt-1 text-slate-400 text-center">No expirations within 30 days.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <table className="w-full text-left text-xs whitespace-nowrap mb-4">
                <thead className="text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Licenses</th>
                    <th className="pb-2 text-right">Expiring On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {expiringSoonLicenses.slice(0, 5).map(l => (
                    <tr key={l.id}>
                      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{l.product?.name || l.productName || 'Product'}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{l.id}</td>
                      <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">{safeDate(l.expiryDate)?.toLocaleDateString() || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Red Alert Box from Mockup */}
              <div className="mt-auto bg-red-50 dark:bg-red-900/10 rounded-lg p-3 flex justify-between items-center text-xs">
                <span className="font-bold text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  {expiringSoonLicenses.length} licenses will expire within 30 days.
                </span>
                <button onClick={() => setActiveTab('company-licenses')} className="font-bold text-indigo-600 hover:underline ml-2 whitespace-nowrap">View All →</button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Licenses Issued */}
        <div id="company-licenses" className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Licenses Issued</h3>
            <button onClick={() => setActiveTab('company-licenses')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Buyer</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Expires On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                {sortedLicenses.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium text-sm">No licenses have been issued yet.</td></tr>
                ) : sortedLicenses.slice(0, 5).map((license) => {
                  const isBulkBuyer = license.user?.role === 'BULK_BUYER';
                  const buyerName = license.customerName || license.user?.fullName || license.user?.username || license.company?.name || 'Customer';
                  const prodName = license.productName || license.product?.name || 'Software';

                  return (
                    <tr key={license.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-200">{prodName}</td>
                      <td className="px-6 py-3 flex items-center space-x-2">
                        <span>{buyerName}</span>
                        {isBulkBuyer ? (
                          <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Bulk Buyer</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Customer</span>
                        )}
                      </td>
                      <td className="px-6 py-3">{license.licenseType || 'Volume'}</td>
                      <td className="px-6 py-3">
                        {license.status === 'ACTIVE' ? (
                          <span className="text-emerald-600 font-bold text-[11px] uppercase tracking-wide">{license.status}</span>
                        ) : (
                          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wide">{license.status || 'INACTIVE'}</span>
                        )}
                      </td>
                      <td className="px-6 py-3">{safeDate(license.issuedDate || license.createdAt)?.toLocaleDateString() || 'N/A'}</td>
                      <td className="px-6 py-3">{safeDate(license.expiryDate)?.toLocaleDateString() || 'N/A'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div id="company-activity" className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
            <button onClick={() => setActiveTab('company-activity')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
          </div>
          
          <div className="flex-1 flex flex-col p-2 h-[300px] overflow-y-auto overflow-x-hidden">
            {activity.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No recent activity available</p>
                <p className="text-xs text-slate-400 mt-2">Activity logs will appear here once customers interact with your products.</p>
              </div>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-800 z-0"></div>
                {activity.slice(0, 10).map((log, idx) => (
                  <div key={log.id || idx} className="relative z-10 flex items-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 mt-1 mr-4 ring-4 ring-white dark:ring-slate-900 group-hover:scale-110 transition-transform"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {log.action || 'Action Recorded'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {log.description || 'No description provided'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1.5">
                        {safeDate(log.createdAt || log.timestamp)?.toLocaleString() || 'Unknown date'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5">Quick Actions</h3>

        <div className="flex flex-wrap gap-4">
          <button onClick={() => setActiveTab('company-licenses')} className="flex-1 min-w-[200px] flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 hover:bg-white transition-all shadow-sm group">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Issue License</p>
              <p className="text-[10px] text-slate-500">Create and issue a new license</p>
            </div>
          </button>

          <button onClick={() => setActiveTab('company-licenses')} className="flex-1 min-w-[200px] flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 hover:bg-white transition-all shadow-sm group">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">View All Licenses</p>
              <p className="text-[10px] text-slate-500">Manage issued licenses</p>
            </div>
          </button>

          <button onClick={handleExportPDF} className="flex-1 min-w-[200px] flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 hover:bg-white transition-all shadow-sm group">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Export Report</p>
              <p className="text-[10px] text-slate-500">Download license report</p>
            </div>
          </button>

          <button onClick={() => setActiveTab('company-analytics')} className="flex-1 min-w-[200px] flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300 hover:bg-white transition-all shadow-sm group">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">View Analytics</p>
              <p className="text-[10px] text-slate-500">Detailed insights & metrics</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  )
}

export default CompanyDashboard
