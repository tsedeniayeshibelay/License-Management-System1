import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userDetails, setUserDetails] = useState({ user: null, licenses: [], devices: [], loading: false });


  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', forceChange: true });
  const [savingPassword, setSavingPassword] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      showNotification('error', 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DETAILS
  const handleOpenDetails = async (user) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
    setUserDetails({ user, licenses: [], devices: [], loading: true });
    try {
      const [userRes, licRes, devRes] = await Promise.allSettled([
        api.get(`/users/${user.id}`),
        api.get(`/licenses/user/${user.id}`),
        api.get(`/devices/user/${user.id}`)
      ]);
      const fetchedUser = userRes.status === 'fulfilled' ? userRes.value.data : user;
      const fetchedLics = licRes.status === 'fulfilled' && Array.isArray(licRes.value.data) ? licRes.value.data : [];
      const fetchedDevs = devRes.status === 'fulfilled' && Array.isArray(devRes.value.data) ? devRes.value.data : [];
      setUserDetails({ user: fetchedUser, licenses: fetchedLics, devices: fetchedDevs, loading: false });
    } catch (e) {
      setUserDetails(prev => ({ ...prev, loading: false }));
    }
  };


  // 3. SUSPEND / ACTIVATE
  const handleToggleSuspend = async (user) => {
    const isCurrentlySuspended = user.status === 'SUSPENDED';
    const nextStatus = isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED';
    const actionName = isCurrentlySuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} account "${user.username}"?`)) return;

    try {
      const res = await api.put(`/users/${user.id}`, { status: nextStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: res.data.status || nextStatus } : u));
      showNotification('success', `User "${user.username}" is now ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || `Failed to ${actionName} user.`);
    }
  };

  // 4. RESET PASSWORD
  const handleOpenResetPassword = (user) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '', forceChange: true });
    setIsPasswordModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordForm(prev => ({ ...prev, newPassword: pwd }));
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (passwordForm.newPassword.length < 8) {
      showNotification('error', 'Password must be at least 8 characters long.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, null, {
        params: {
          newPassword: passwordForm.newPassword,
          forceChange: passwordForm.forceChange
        }
      });
      showNotification('success', `Password for "${selectedUser.username}" reset successfully.`);
      setIsPasswordModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // 5. GUARDED DELETE
  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      showNotification('success', `User "${selectedUser.username}" removed.`);
      setIsDeleteModalOpen(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchTerm.toLowerCase();
    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const fullName = (u.fullName || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const company = (u.company || '').toLowerCase();
    return username.includes(query) || email.includes(query) || fullName.includes(query) || role.includes(query) || company.includes(query);
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage platform users, roles, and access controls.</p>
        </div>
        <button 
          onClick={fetchUsers} 
          title="Refresh Users" 
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>

      {notification.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border animate-in fade-in duration-200 ${
          notification.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification({ type: '', text: '' })} className="hover:opacity-75 font-bold text-sm ml-2">✕</button>
        </div>
      )}

      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0b0f19]/50 flex items-center justify-between">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Search by username, email, name, role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0b0f19] border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-80 transition-all"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Total Users: <span className="font-bold text-white">{filteredUsers.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">User</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Created At</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-bold">Loading Users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <p className="text-sm font-bold">No users found.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{user.username}</span>
                          <span className="text-[10px] text-slate-400 block">{user.fullName || (user.company ? `Company: ${user.company}` : '')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border
                        ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          user.role === 'COMPANY' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          user.role === 'BULK_BUYER' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'SUSPENDED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Suspended
                        </span>
                      ) : user.status === 'DELETED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* View Details */}
                        <button 
                          onClick={() => handleOpenDetails(user)} 
                          title="View User Details" 
                          className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>


                        {/* Suspend / Activate Toggle */}
                        <button 
                          onClick={() => handleToggleSuspend(user)} 
                          title={user.status === 'SUSPENDED' ? 'Activate Account' : 'Suspend Account'} 
                          className={`p-1.5 rounded-lg transition-colors ${user.status === 'SUSPENDED' ? 'text-amber-400 hover:bg-emerald-500/10 hover:text-emerald-400' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                        >
                          {user.status === 'SUSPENDED' ? (
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

                        {/* Reset Password */}
                        <button 
                          onClick={() => handleOpenResetPassword(user)} 
                          title="Reset Password" 
                          className="text-slate-400 hover:text-violet-400 p-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>

                        {/* Delete User */}
                        <button 
                          onClick={() => handleOpenDelete(user)} 
                          title="Remove User" 
                          className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: VIEW USER DETAILS --- */}
      {isDetailsOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-white max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base">
                  {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.fullName || selectedUser.username}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
              {/* Profile summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#0b0f19] p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Username</span>
                  <span className="text-xs font-semibold text-slate-200">{selectedUser.username}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Role</span>
                  <span className="text-xs font-bold text-indigo-400">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Status</span>
                  <span className={`text-xs font-bold ${selectedUser.status === 'SUSPENDED' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedUser.status || 'ACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Company</span>
                  <span className="text-xs font-medium text-slate-300">{selectedUser.company || 'Personal Account'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Phone</span>
                  <span className="text-xs font-medium text-slate-300">{selectedUser.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">2FA Authentication</span>
                  <span className={`text-xs font-bold ${selectedUser.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Owned / Assigned Licenses */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Assigned Licenses ({userDetails.licenses.length})</span>
                </h4>
                {userDetails.loading ? (
                  <div className="text-center py-4 text-xs text-slate-500">Loading licenses...</div>
                ) : userDetails.licenses.length === 0 ? (
                  <div className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No active software licenses assigned to this user.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userDetails.licenses.map(lic => (
                      <div key={lic.id} className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{lic.productName || lic.product?.name || `License #${lic.id}`}</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{lic.licenseKey || 'Key Active'}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {lic.status || 'ACTIVE'}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Expires: {lic.expiryDate || 'Perpetual'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bound Devices */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Registered Hardware Devices ({userDetails.devices.length})</span>
                </h4>
                {userDetails.loading ? (
                  <div className="text-center py-4 text-xs text-slate-500">Loading devices...</div>
                ) : userDetails.devices.length === 0 ? (
                  <div className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No hardware devices registered for this user yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userDetails.devices.map(dev => (
                      <div key={dev.id} className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{dev.deviceName || 'Workstation'}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{dev.os ? `${dev.os} • ` : ''}IP: {dev.ipAddress || '127.0.0.1'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dev.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                          {dev.isActive !== false ? 'Active' : 'Suspended'}
                        </span>
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


      {/* --- MODAL 3: RESET PASSWORD --- */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Reset Password: {selectedUser.username}</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Temporary Password</label>
                  <button 
                    type="button" 
                    onClick={handleGeneratePassword} 
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <input 
                  type="text" 
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#0b0f19] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="forceChangeCheck"
                  checked={passwordForm.forceChange}
                  onChange={(e) => setPasswordForm({ ...passwordForm, forceChange: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <label htmlFor="forceChangeCheck" className="text-xs text-slate-300 cursor-pointer">
                  Require user to change password on next sign in
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
                >
                  {savingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: GUARDED DELETE CONFIRMATION --- */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center space-x-3 mb-4 text-red-400">
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account</h3>
                <p className="text-xs text-slate-400">Guarded deletion with audit preservation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to delete user <strong className="text-white font-mono">"{selectedUser.username}"</strong> (<span className="text-slate-400">{selectedUser.email}</span>)?
            </p>

            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[11px] text-slate-400 space-y-1 mb-5">
              <p className="font-semibold text-red-400">Guarded Audit Protection:</p>
              <p>• Active licenses will be safely revoked and hardware activations deactivated.</p>
              <p>• Historical invoices, orders, and security logs will be preserved.</p>
              <p>• The user will be immediately locked out from the platform.</p>
            </div>

            <div className="flex justify-end space-x-3 border-t border-slate-800 pt-4">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={deletingUser}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {deletingUser ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
