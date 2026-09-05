import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)]">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-slate-500 font-bold">Loading Analytics...</span>
      </div>
    );
  }

  if (!stats) return null;

  // Format data for charts
  const activationsTimeline = Object.entries(stats.activationsLast30Days || {}).map(([date, count]) => ({
    date: date.substring(5), // MM-DD
    count
  }));

  const licenseTypes = Object.entries(stats.licenseTypeDistribution || {}).map(([type, value]) => ({
    name: type.replace('_', ' '),
    value
  }));

  const topCountries = Object.entries(stats.topCountries || {}).map(([country, count]) => ({
    name: country,
    activations: count
  }));

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Global Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Deep dive into platform usage and activation trends.</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors">
            Last 30 Days
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Activations</h3>
            <div className="text-3xl font-bold text-white">
              {Object.values(stats.activationsLast30Days || {}).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-xs text-emerald-400 font-medium mt-2">â†‘ Last 30 days</p>
          </div>
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active Customers</h3>
            <div className="text-3xl font-bold text-white">{stats.totalCustomers}</div>
            <p className="text-xs text-emerald-400 font-medium mt-2">All time</p>
          </div>
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enterprise Clients</h3>
            <div className="text-3xl font-bold text-white">{stats.totalCompanies}</div>
            <p className="text-xs text-emerald-400 font-medium mt-2">All time</p>
          </div>
          <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Licenses</h3>
            <div className="text-3xl font-bold text-white">{stats.totalLicenses}</div>
            <p className="text-xs text-slate-400 font-medium mt-2">Platform total</p>
          </div>
        </div>

        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm h-[400px]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Activation Trends (30 Days)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={activationsTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* License Types Donut */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">License Distribution</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={licenseTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {licenseTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {licenseTypes.map((type, i) => (
              <div key={type.name} className="flex items-center text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="truncate" title={type.name}>{type.name} ({type.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries Bar Chart */}
        <div className="lg:col-span-3 bg-[#111827] border border-slate-800/80 rounded-xl p-6 shadow-sm h-[400px]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Top Activation Regions</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={topCountries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip 
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
              />
              <Bar dataKey="activations" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
