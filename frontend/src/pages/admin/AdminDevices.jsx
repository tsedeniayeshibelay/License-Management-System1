import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Helper to safely format dates
const safeDateStr = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
};

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState(false);
  const [unbinding, setUnbinding] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch devices', err);
      showNotification('error', 'Failed to load registered devices.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DEVICE DETAILS
  const handleOpenDetails = (device) => {
    setSelectedDevice(device);
    setIsDetailsOpen(true);
  };

  // 2. UNBIND HARDWARE (Release Activation Seat)
  const handleOpenUnbind = (device) => {
    setSelectedDevice(device);
    setIsUnbindModalOpen(true);
  };

  const handleConfirmUnbind = async () => {
    if (!selectedDevice) return;
    setUnbinding(true);
    try {
      if (selectedDevice.activationId) {
        await api.put(`/activations/${selectedDevice.activationId}/deactivate`);
      } else {
        await api.put(`/devices/${selectedDevice.id}`, { isActive: true });
      }
      setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { 
        ...d, 
        activationId: null, 
        licenseId: null, 
        licenseKey: null, 
        productName: null 
      } : d));
      showNotification('success', `Workstation "${selectedDevice.deviceName}" unlinked. Seat released.`);
      setIsUnbindModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to unbind device.');
    } finally {
      setUnbinding(false);
    }
  };

  // 3. SUSPEND / ACTIVATE DEVICE
  const handleToggleSuspendDevice = async (device) => {
    const nextActive = device.isActive === false;
    const actionName = nextActive ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} workstation "${device.deviceName || 'Device'}"?`)) return;

    try {
      await api.put(`/devices/${device.id}`, { isActive: nextActive });
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, isActive: nextActive } : d));
      showNotification('success', `Workstation "${device.deviceName || 'Device'}" is now ${nextActive ? 'active' : 'suspended'}.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || `Failed to ${actionName} device.`);
    }
  };

  // 4. GUARDED DELETE
  const handleOpenDelete = (device) => {
    setSelectedDevice(device);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDevice) return;
    setDeleting(true);
    try {
      await api.delete(`/devices/${selectedDevice.id}`);
      setDevices(prev => prev.filter(d => d.id !== selectedDevice.id));
      showNotification('success', `Device record "${selectedDevice.deviceName}" removed.`);
      setIsDeleteModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete device.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDevices = devices.filter(d => {
    const query = searchTerm.toLowerCase();
    const name = (d.deviceName || '').toLowerCase();
    const user = (d.userFullName || d.username || d.user?.username || '').toLowerCase();
    const os = (d.os || '').toLowerCase();
    return name.includes(query) || user.includes(query) || os.includes(query);
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Workstation & Device Registry</h2>
          <p className="text-sm text-slate-400 mt-1">Audit, monitor, and manage user devices and authorized workstations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchDevices} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh devices"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="relative w-full max-w-md">
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search workstations by device name, owner, or OS..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Device Name</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Operating System</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Owner User</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-bold">Loading Devices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <p className="text-sm font-bold">No registered devices found.</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map(device => {
                  const ownerName = device.userFullName || device.username || device.user?.fullName || device.user?.username || (device.userId ? `User #${device.userId}` : 'Registered User');
                  const lastActiveDate = safeDateStr(device.lastSeen || device.activatedAt || device.createdAt);
                  const isSuspended = device.isActive === false;

                  return (
                    <tr key={device.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <div>
                            <span className="font-bold text-white block">{device.deviceName || 'Personal Workstation'}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{device.ipAddress ? `IP: ${device.ipAddress}` : (device.os ? `${device.os} Workstation` : 'Registered Device')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs font-medium">
                        {device.os ? `${device.os}${device.osVersion ? ` ${device.osVersion}` : ''}` : 'Windows / PC'}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        <div>
                          <span className="block">{ownerName}</span>
                          {device.userEmail && <span className="block text-[10px] font-mono text-slate-500">{device.userEmail}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-mono">{lastActiveDate}</td>
                      <td className="px-6 py-4">
                        {!isSuspended ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* 1. View Device Details */}
                          <button 
                            onClick={() => handleOpenDetails(device)} 
                            title="View Workstation Details" 
                            className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* 2. Unbind Hardware / Release Seat */}
                          <button 
                            onClick={() => handleOpenUnbind(device)} 
                            title="Unlink Workstation & Release Seat" 
                            className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* 3. Suspend / Activate Device Toggle */}
                          <button 
                            onClick={() => handleToggleSuspendDevice(device)} 
                            title={isSuspended ? 'Activate Workstation' : 'Suspend Workstation'} 
                            className={`p-1.5 rounded-lg transition-colors ${isSuspended ? 'text-amber-400 hover:bg-emerald-500/10 hover:text-emerald-400' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          >
                            {isSuspended ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* 4. Delete Device */}
                          <button 
                            onClick={() => handleOpenDelete(device)} 
                            title="Remove Workstation Record" 
                            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
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

      {/* --- MODAL 1: VIEW DEVICE DETAILS --- */}
      {isDetailsOpen && selectedDevice && (
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
                  <h3 className="text-base font-bold text-white">{selectedDevice.deviceName || 'Personal Workstation'}</h3>
                </div>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#0b0f19] p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Operating System</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedDevice.os ? `${selectedDevice.os}${selectedDevice.osVersion ? ` ${selectedDevice.osVersion}` : ''}` : 'Windows / PC'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Workstation Status</span>
                  <span className={`text-xs font-bold ${selectedDevice.isActive !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedDevice.isActive !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">IP Address</span>
                  <span className="text-xs font-mono text-slate-300">{selectedDevice.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Owner User</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedDevice.userFullName || selectedDevice.username || (selectedDevice.userId ? `User #${selectedDevice.userId}` : 'Registered User')}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-slate-400 text-[11px] px-1">
                <div>
                  <span className="text-slate-500 block">First Registered:</span>
                  <span>{safeDateStr(selectedDevice.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Active Session:</span>
                  <span>{safeDateStr(selectedDevice.lastSeen || selectedDevice.activatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end mt-5">
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

      {/* --- MODAL 2: UNBIND HARDWARE CONFIRMATION --- */}
      {isUnbindModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center space-x-3 mb-4 text-amber-400">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Release Hardware Seat</h3>
                <p className="text-xs text-slate-400">Unlink workstation registration</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to release the hardware seat for workstation <strong className="text-white font-mono">{selectedDevice.deviceName || 'Device'}</strong>? The seat will be returned to the license pool.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => setIsUnbindModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmUnbind}
                disabled={unbinding}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {unbinding ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: GUARDED DELETE CONFIRMATION --- */}
      {isDeleteModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Remove Device Record</h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-slate-300">
                Are you sure you want to remove <strong className="text-white">{selectedDevice.deviceName || 'this device'}</strong>?
              </p>
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-400">
                If this workstation has historical activation sessions, they will be archived to preserve license audit logs.
              </div>
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
                {deleting ? 'Removing...' : 'Delete Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
