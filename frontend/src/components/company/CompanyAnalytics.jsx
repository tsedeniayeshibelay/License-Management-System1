import React, { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const STATUS_COLORS = {
  ACTIVE: '#10b981', // Emerald
  EXPIRED: '#f59e0b', // Orange/Amber
  REVOKED: '#ef4444', // Red
  INACTIVE: '#94a3b8', // Slate
  NOT_ACTIVATED: '#94a3b8'
};

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export default function CompanyAnalytics({ licenses = [], products = [] }) {
  
  // 1. License Activity Timeline (Line Chart)
  const activityData = useMemo(() => {
    if (!licenses || licenses.length === 0) return [];
    
    const counts = {};
    licenses.forEach(l => {
      const d = safeDate(l.issuedDate || l.createdAt);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!counts[key]) counts[key] = { name: key, LicensesIssued: 0, Activations: 0, Revocations: 0 };
        counts[key].LicensesIssued++;
        if (l.status === 'REVOKED') counts[key].Revocations++;
        counts[key].Activations += (l.usedSeats || 0);
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

  // 2. License Status Distribution (Donut Chart)
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

  // 3. Product Popularity (Bar Chart)
  const productData = useMemo(() => {
    const counts = {};
    licenses.forEach(l => {
      const pName = l.productName || l.product?.name || (products.find(p => p.id === (l.productId || l.product?.id))?.name) || 'Unknown Product';
      counts[pName] = (counts[pName] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      Licenses: counts[key]
    })).sort((a,b) => b.Licenses - a.Licenses);
  }, [licenses, products]);

  const hasActivityData = activityData.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Deep dive into your product performance and license distribution.</p>
        </div>
        <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Issuance Over Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">License Issuance Over Time</h3>
            <p className="text-xs text-slate-500 mt-1">Tracking new licenses and activations</p>
          </div>
          {hasActivityData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="LicensesIssued" name="Licenses Issued" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Activations" name="Seats Activated" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              <p className="text-sm font-medium text-slate-500">No historical activity data available</p>
            </div>
          )}
        </div>

        {/* Product Popularity Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Licenses per Product</h3>
            <p className="text-xs text-slate-500 mt-1">Which products have the most licenses?</p>
          </div>
          {productData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{fill: '#334155', opacity: 0.1}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="Licenses" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-500">
              No products found
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global License Health</h3>
            <p className="text-xs text-slate-500 mt-1">Status distribution across all products</p>
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value} Licenses`, 'Count']}
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{licenses.length}</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-full w-48 h-48 mx-auto my-auto">
                <p className="text-sm font-medium text-slate-500">No data</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
