import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminActivations() {
  const [activations, setActivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedActivation, setSelectedActivation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchActivations();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchActivations = async () => {
    try {
      const res = await api.get('/activations/all');
      const dataArray = Array.isArray(res.data) ? res.data : [];
      // Sort newest first
      const sorted = dataArray.sort((a, b) => 
        new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0)
      );
      setActivations(sorted);
    } catch (err) {
      console.error('Failed to fetch activations', err);
      showNotification('error', 'Failed to load activations.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (act) => {
    setSelectedActivation(act);
    setIsDetailsOpen(true);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this hardware? This will release the seat back to the license.')) {
      return;
    }
    try {
      await api.put(`/activations/${id}/deactivate`);
      setActivations(prev => prev.map(a => a.id === id ? { ...a, isActive: false, deactivatedAt: new Date().toISOString() } : a));
      showNotification('success', 'Hardware deactivated and license seat released.');
    } catch (err) {
      console.error('Failed to deactivate', err);
      showNotification('error', err.response?.data?.message || 'Failed to deactivate hardware.');
    }
  };

  const handleOpenDelete = (act) => {
    setSelectedActivation(act);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedActivation) return;
    setDeleting(true);
    try {
      await api.delete(`/activations/${selectedActivation.id}`);
      setActivations(prev => prev.filter(a => a.id !== selectedActivation.id));
      showNotification('success', 'Activation record removed.');
      setIsDeleteModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete activation.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredActivations = activations.filter(a => {
    const term = searchTerm.toLowerCase();
    const devName = (a.deviceName || a.device?.deviceName || `Device #${a.deviceId}`).toLowerCase();
    const prodName = (a.productName || '').toLowerCase();
    const userEmail = (a.userEmail || '').toLowerCase();
    const matchesSearch = devName.includes(term) || prodName.includes(term) || userEmail.includes(term);

    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? a.isActive :
      !a.isActive;

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
          <h2 className="text-2xl font-bold text-white tracking-tight">Global Activations</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor, inspect, and manage hardware activations across the platform.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchActivations}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh activations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Status Filter */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search by device, product, or user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {['ALL', 'ACTIVE', 'DEACTIVATED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
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
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-[#0f172a] border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Device Name</th>
                <th className="px-6 py-4 font-bold tracking-wider">Product</th>
                <th className="px-6 py-4 font-bold tracking-wider">Assigned User</th>
                <th className="px-6 py-4 font-bold tracking-wider">Activated At</th>
                <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-slate-500 font-medium text-xs">Loading activations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredActivations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    No activations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredActivations.map((a) => {
                  const devName = a.deviceName || a.device?.deviceName || `Device #${a.deviceId}`;
                  const prodName = a.productName || 'Software Product';

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-medium text-white block text-sm">{devName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-200 block text-sm">{prodName}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                        {a.userEmail || `User #${a.userId || '-'}`}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-mono">
                        {a.activatedAt ? new Date(a.activatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {a.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Details */}
                          <button 
                            onClick={() => handleOpenDetails(a)}
                            title="View Activation Details"
                            className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Revoke / Deactivate */}
                          {a.isActive && (
                            <button 
                              onClick={() => handleDeactivate(a.id)}
                              title="Deactivate Hardware & Release Seat"
                              className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}

                          {/* Guarded Delete */}
                          <button 
                            onClick={() => handleOpenDelete(a)}
                            title="Remove Activation Record"
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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

      {/* --- MODAL 1: VIEW DETAILS --- */}
      {isDetailsOpen && selectedActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedActivation.deviceName || `Device #${selectedActivation.deviceId}`}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product</span>
                  <span className="text-white font-medium block truncate">{selectedActivation.productName || 'Software Product'}</span>
                </div>

                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                  <span className={`font-bold text-xs uppercase ${selectedActivation.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {selectedActivation.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned User</span>
                  <span className="text-slate-300 text-xs font-mono block truncate">{selectedActivation.userEmail || 'N/A'}</span>
                </div>

                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Operating System</span>
                  <span className="text-slate-300 text-xs block truncate">{selectedActivation.os || 'Desktop OS'}</span>
                </div>

                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Activated Date</span>
                  <span className="text-slate-300 font-mono text-xs block truncate">
                    {selectedActivation.activatedAt ? new Date(selectedActivation.activatedAt).toLocaleDateString() : '-'}
                  </span>
                </div>

                <div className="bg-[#0b0f19]/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deactivated Date</span>
                  <span className="text-slate-300 font-mono text-xs block truncate">
                    {selectedActivation.deactivatedAt ? new Date(selectedActivation.deactivatedAt).toLocaleDateString() : 'N/A (Active)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex justify-end mt-5">
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

      {/* --- MODAL 2: GUARDED DELETE --- */}
      {isDeleteModalOpen && selectedActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Remove Activation Record</h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-slate-300">
                Are you sure you want to remove the activation record for <strong className="text-white">{selectedActivation.deviceName || `Device #${selectedActivation.deviceId}`}</strong>?
              </p>
              {selectedActivation.isActive ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ⚠️ This activation is currently <strong>Active</strong>. Deleting it will release the seat.
                </div>
              ) : (
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-400">
                  This activation is already deactivated. Removing it will clear the history entry.
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
