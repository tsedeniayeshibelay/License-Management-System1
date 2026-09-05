import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Helper to safely format dates
const safeDateStr = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedLicense, setSelectedLicense] = useState(null);
  
  // 1. Details Modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [licenseActivations, setLicenseActivations] = useState({ list: [], loading: false });

  // 2. Renew / Extend Modal
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewDate, setRenewDate] = useState('');
  const [savingRenew, setSavingRenew] = useState(false);

  // 3. Adjust Seats Modal
  const [isSeatsOpen, setIsSeatsOpen] = useState(false);
  const [seatsForm, setSeatsForm] = useState({ totalSeats: 1, maxActivations: 1 });
  const [savingSeats, setSavingSeats] = useState(false);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchLicenses = async () => {
    try {
      const res = await api.get('/licenses');
      const rawData = res.data?.content || res.data;
      setLicenses(Array.isArray(rawData) ? rawData : []);
    } catch (err) {
      console.error('Failed to fetch licenses', err);
      showNotification('error', 'Failed to load licenses.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DETAILS
  const handleOpenDetails = async (license) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
    setLicenseActivations({ list: [], loading: true });
    try {
      const res = await api.get(`/activations/license/${license.id}`);
      setLicenseActivations({
        list: Array.isArray(res.data) ? res.data : [],
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch activations for license', err);
      setLicenseActivations({ list: [], loading: false });
    }
  };

  // Unbind directly from details drawer
  const handleUnbindActivation = async (activationId) => {
    if (!window.confirm('Release this hardware seat? The device will be deactivated.')) return;
    try {
      await api.put(`/activations/${activationId}/deactivate`);
      showNotification('success', 'Hardware unbound and seat released.');
      if (selectedLicense) {
        handleOpenDetails(selectedLicense);
        fetchLicenses();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to unbind activation.');
    }
  };

  // 2. EXTEND / RENEW
  const handleOpenRenew = (license) => {
    setSelectedLicense(license);
    const baseDate = license.expiryDate ? new Date(license.expiryDate) : new Date();
    const futureDate = baseDate > new Date() ? baseDate : new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    setRenewDate(futureDate.toISOString().split('T')[0]);
    setIsRenewOpen(true);
  };

  const handleQuickAddDays = (days) => {
    const base = selectedLicense?.expiryDate ? new Date(selectedLicense.expiryDate) : new Date();
    const curr = base > new Date() ? base : new Date();
    curr.setDate(curr.getDate() + days);
    setRenewDate(curr.toISOString().split('T')[0]);
  };

  const handleSaveRenew = async (e) => {
    e.preventDefault();
    if (!selectedLicense || !renewDate) return;
    setSavingRenew(true);
    try {
      const res = await api.put(`/licenses/${selectedLicense.id}/renew`, null, {
        params: { newExpiryDate: renewDate }
      });
      setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? { ...l, ...res.data } : l));
      showNotification('success', `License renewed successfully until ${renewDate}.`);
      setIsRenewOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to renew license.');
    } finally {
      setSavingRenew(false);
    }
  };

  // 3. REACTIVATE
  const handleReactivate = async (license) => {
    if (!window.confirm(`Reactivate license for ${license.productName || 'product'}?`)) return;
    try {
      const res = await api.put(`/licenses/${license.id}/reactivate`);
      setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, ...res.data } : l));
      showNotification('success', 'License reactivated successfully.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to reactivate license.');
    }
  };

  // 4. REVOKE
  const handleRevoke = async (license) => {
    if (!window.confirm(`Are you sure you want to revoke this license? Active installations will fail license validation.`)) return;
    try {
      await api.delete(`/licenses/${license.id}`);
      setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, status: 'REVOKED' } : l));
      showNotification('success', 'License revoked successfully.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to revoke license.');
    }
  };

  // 5. ADJUST SEATS
  const handleOpenSeats = (license) => {
    setSelectedLicense(license);
    const total = license.totalSeats || license.maxActivations || 1;
    setSeatsForm({
      totalSeats: total,
      maxActivations: license.maxActivations || total
    });
    setIsSeatsOpen(true);
  };

  const handleSaveSeats = async (e) => {
    e.preventDefault();
    if (!selectedLicense) return;
    setSavingSeats(true);
    try {
      const res = await api.put(`/licenses/${selectedLicense.id}`, {
        productId: selectedLicense.productId || selectedLicense.product?.id,
        userId: selectedLicense.userId || selectedLicense.user?.id,
        companyId: selectedLicense.companyId || selectedLicense.company?.id,
        licenseType: selectedLicense.licenseType || 'SUBSCRIPTION',
        totalSeats: parseInt(seatsForm.totalSeats, 10),
        maxActivations: parseInt(seatsForm.maxActivations, 10),
        expiryDate: selectedLicense.expiryDate || new Date().toISOString().split('T')[0]
      });
      setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? { 
        ...l, 
        totalSeats: res.data.totalSeats || seatsForm.totalSeats,
        maxActivations: res.data.maxActivations || seatsForm.maxActivations 
      } : l));
      showNotification('success', 'License seats updated successfully.');
      setIsSeatsOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update seats.');
    } finally {
      setSavingSeats(false);
    }
  };

  // Filtered list (without key matching)
  const filteredLicenses = licenses.filter(l => {
    const term = searchTerm.toLowerCase();
    const prod = (l.product?.name || l.productName || '').toLowerCase();
    const owner = (l.company?.name || l.user?.fullName || l.user?.username || l.customerEmail || '').toLowerCase();
    const matchesSearch = prod.includes(term) || owner.includes(term);

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Toast Notification */}
      {notification.text && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification({ type: '', text: '' })} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">License Management</h2>
          <p className="text-sm text-slate-400 mt-1">View, track, and manage all issued software licenses and hardware seat allocations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchLicenses}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh licenses"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search by product or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === status 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Owner (User/Company)</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Seat Usage</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-bold">Loading Licenses...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-bold">No licenses found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLicenses.map(license => {
                  const productName = license.product?.name || license.productName || 'Software License';
                  const ownerName = license.company?.name || license.user?.fullName || license.user?.username || license.customerEmail || 'Unassigned';
                  const usedSeats = license.usedSeats || 0;
                  const totalSeats = license.totalSeats || license.maxActivations || 1;
                  
                  let statusClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                  let statusText = license.status || 'INACTIVE';
                  if (statusText === 'ACTIVE') {
                    statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if (statusText === 'EXPIRED') {
                    statusClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                  } else if (statusText === 'REVOKED') {
                    statusClass = 'bg-red-500/10 text-red-400 border-red-500/20';
                  }

                  return (
                    <tr key={license.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-white font-medium block">{productName}</span>
                            <span className="text-[11px] text-slate-500 uppercase tracking-wider">{license.licenseType || 'STANDARD'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 font-medium block">{ownerName}</span>
                        {license.customerEmail && <span className="text-xs text-slate-500 block">{license.customerEmail}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold font-mono ${usedSeats >= totalSeats ? 'text-amber-400' : 'text-slate-300'}`}>
                            {usedSeats} / {totalSeats}
                          </span>
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${usedSeats >= totalSeats ? 'bg-amber-400' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(100, Math.round((usedSeats / totalSeats) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                        {safeDateStr(license.expiryDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Details */}
                          <button 
                            onClick={() => handleOpenDetails(license)} 
                            title="View License Details & Activations" 
                            className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Extend / Renew Expiration */}
                          <button 
                            onClick={() => handleOpenRenew(license)} 
                            title="Renew / Extend Expiration" 
                            className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* Adjust Seats */}
                          <button 
                            onClick={() => handleOpenSeats(license)} 
                            title="Adjust Seats Allocation" 
                            className="text-slate-400 hover:text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </button>

                          {/* Reactivate or Revoke Toggle */}
                          {license.status === 'REVOKED' ? (
                            <button 
                              onClick={() => handleReactivate(license)} 
                              title="Reactivate License" 
                              className="text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRevoke(license)} 
                              title="Revoke License" 
                              className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: VIEW LICENSE DETAILS & ACTIVATIONS --- */}
      {isDetailsOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col text-white">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedLicense.product?.name || selectedLicense.productName || 'Software License'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="overflow-y-auto space-y-5 pr-1 text-sm">
              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Owner</span>
                  <span className="text-white font-medium block truncate">
                    {selectedLicense.company?.name || selectedLicense.user?.fullName || selectedLicense.user?.username || 'Unassigned'}
                  </span>
                </div>
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                  <span className="font-bold text-xs uppercase text-emerald-400">{selectedLicense.status}</span>
                </div>
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</span>
                  <span className="font-medium text-xs text-slate-300">{selectedLicense.licenseType || 'SUBSCRIPTION'}</span>
                </div>
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Issued Date</span>
                  <span className="text-slate-300 font-mono text-xs">{safeDateStr(selectedLicense.issuedDate)}</span>
                </div>
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry Date</span>
                  <span className="text-slate-300 font-mono text-xs">{safeDateStr(selectedLicense.expiryDate)}</span>
                </div>
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Seat Usage</span>
                  <span className="text-indigo-400 font-bold font-mono text-xs">
                    {selectedLicense.usedSeats || 0} / {selectedLicense.totalSeats || selectedLicense.maxActivations || 1}
                  </span>
                </div>
              </div>

              {/* Active Hardware Activations */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Bound Workstations ({licenseActivations.list.length})
                </h4>

                {licenseActivations.loading ? (
                  <div className="p-4 text-center text-xs text-slate-500">Loading bound workstations...</div>
                ) : licenseActivations.list.length === 0 ? (
                  <div className="bg-[#0b0f19]/40 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500">
                    No hardware workstations currently bound to this license.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {licenseActivations.list.map(act => (
                      <div key={act.id} className="bg-[#0b0f19] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white text-xs">
                              {act.deviceName || `Device #${act.deviceId}`}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              act.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {act.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                            Activated: {new Date(act.activatedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {act.isActive && (
                          <button
                            onClick={() => handleUnbindActivation(act.id)}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                          >
                            Unbind Seat
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EXTEND / RENEW --- */}
      {isRenewOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Renew / Extend License</h3>
              <button onClick={() => setIsRenewOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveRenew} className="space-y-4">
              <p className="text-xs text-slate-400">
                Updating the expiration date will automatically renew this license and ensure software clients remain active.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Expiration Date</label>
                <input 
                  type="date" 
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Quick Add:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAddDays(30)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddDays(90)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  +90 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddDays(365)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  +1 Year
                </button>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsRenewOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingRenew}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {savingRenew ? 'Saving...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADJUST SEATS --- */}
      {isSeatsOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Adjust License Seats</h3>
              <button onClick={() => setIsSeatsOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveSeats} className="space-y-4">
              <p className="text-xs text-slate-400">
                Configure the total available hardware seats and maximum concurrent activations for this license.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Seats Allocation</label>
                <input 
                  type="number" 
                  min="1"
                  max="10000"
                  value={seatsForm.totalSeats}
                  onChange={(e) => setSeatsForm({ ...seatsForm, totalSeats: e.target.value, maxActivations: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsSeatsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingSeats}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {savingSeats ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
