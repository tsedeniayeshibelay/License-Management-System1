import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Helper to safely format dates
const safeDateStr = (dateStr) => {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usage-logs');
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch activity logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (actionName, method) => {
    const act = (actionName || method || 'Activity').toUpperCase();
    if (act.includes('ACTIVAT')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          {actionName || 'Activation'}
        </span>
      );
    }
    if (act.includes('OFFLINE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          {actionName || 'Offline Event'}
        </span>
      );
    }
    if (act.includes('REVOK') || act.includes('DEACTIVAT')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          {actionName || 'Revocation'}
        </span>
      );
    }
    if (act.includes('VALIDAT') || act.includes('SYNC')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          {actionName || 'Validation'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        {actionName || 'System Event'}
      </span>
    );
  };

  const filteredLogs = logs.filter(log => {
    const q = searchTerm.toLowerCase();
    const action = (log.action || log.featuresUsed || '').toLowerCase();
    const dev = (log.deviceName || '').toLowerCase();
    const prod = (log.productName || '').toLowerCase();
    const user = (log.userFullName || log.username || '').toLowerCase();
    const ip = (log.formattedIpAddress || log.ipAddress || '').toLowerCase();
    const details = (log.details || log.featuresUsed || '').toLowerCase();
    return action.includes(q) || dev.includes(q) || prod.includes(q) || user.includes(q) || ip.includes(q) || details.includes(q);
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Activity Log</h2>
          <p className="text-sm text-slate-400 mt-1">Global audit trail of system events, device activations, and operations.</p>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0b0f19]/50 flex items-center justify-between">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search by action, device, product, IP, details..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0b0f19] border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-80 transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchLogs} 
              title="Refresh Logs" 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Action / Event</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Device Name</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-bold">Loading Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    <p className="text-sm font-bold">No activity logs found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const timestampStr = safeDateStr(log.timestamp || log.sessionStart || log.createdAt);
                  const actionName = log.action || log.featuresUsed || (log.activationMethod ? `${log.activationMethod} Validation` : 'System Verified');
                  const deviceDisplayName = log.deviceName || (log.productName ? `${log.productName} Device` : (log.username ? `${log.username}'s Device` : 'Primary Device'));
                  const ipStr = log.formattedIpAddress || log.ipAddress || (log.activationMethod === 'Offline' ? 'Offline (Airgapped)' : '127.0.0.1 (Local)');
                  const detailsStr = log.details || (log.durationMinutes && log.durationMinutes > 0 ? `${log.durationMinutes} min session • ${log.activationMethod || 'Online'}` : (log.featuresUsed || `${log.activationMethod || 'Online'} Telemetry`));
                  const isAirgapped = ipStr.toLowerCase().includes('offline') || ipStr.toLowerCase().includes('airgap');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-slate-300 text-xs font-mono">{timestampStr}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          {getEventBadge(actionName, log.activationMethod)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-white text-xs block">
                              {deviceDisplayName}
                            </span>
                            {(log.productName || log.userFullName) && (
                              <span className="text-[11px] text-slate-400 block">
                                {[log.productName, log.userFullName].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isAirgapped 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {ipStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-300 font-medium max-w-[280px] truncate inline-block" title={detailsStr}>
                          {detailsStr}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
