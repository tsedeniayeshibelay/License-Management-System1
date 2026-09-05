import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState({ list: [], loading: false });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: ''
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch companies', err);
      showNotification('error', 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DETAILS & MEMBERS
  const handleOpenDetails = async (company) => {
    setSelectedCompany(company);
    setIsDetailsOpen(true);
    setCompanyMembers({ list: [], loading: true });
    try {
      const res = await api.get(`/companies/${company.id}/members`);
      setCompanyMembers({ list: Array.isArray(res.data) ? res.data : [], loading: false });
    } catch (err) {
      console.error('Failed to fetch company members', err);
      setCompanyMembers({ list: [], loading: false });
    }
  };

  // 2. ADD COMPANY
  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      address: ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) {
      showNotification('error', 'Company name and email are required.');
      return;
    }
    setSavingAdd(true);
    try {
      const res = await api.post('/companies', addForm);
      setCompanies(prev => [res.data, ...prev]);
      setIsAddModalOpen(false);
      showNotification('success', `Company "${res.data.name}" added successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to create company.');
    } finally {
      setSavingAdd(false);
    }
  };

  // 3. EDIT COMPANY
  const handleOpenEdit = (company) => {
    setSelectedCompany(company);
    setEditForm({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      industry: company.industry || '',
      address: company.address || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      showNotification('error', 'Company name and email are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await api.put(`/companies/${selectedCompany.id}`, editForm);
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? res.data : c));
      setIsEditModalOpen(false);
      showNotification('success', `Company "${res.data.name}" updated successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update company.');
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. SUSPEND / ACTIVATE TOGGLE
  const handleToggleStatus = async (company) => {
    const isCurrentlyActive = company.status === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    const actionName = isCurrentlyActive ? 'suspend' : 'activate';
    
    if (!window.confirm(`Are you sure you want to ${actionName} "${company.name}"?`)) return;

    try {
      const res = await api.patch(`/companies/${company.id}/status?status=${nextStatus}`);
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: res.data.status || nextStatus } : c));
      showNotification('success', `Company "${company.name}" is now ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || `Failed to ${actionName} company.`);
    }
  };

  // 5. GUARDED DELETE
  const handleOpenDelete = (company) => {
    setSelectedCompany(company);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCompany) return;
    setDeletingCompany(true);
    try {
      await api.delete(`/companies/${selectedCompany.id}`);
      // Refresh to observe if soft-deactivated or removed
      await fetchCompanies();
      setIsDeleteModalOpen(false);
      showNotification('success', `Company "${selectedCompany.name}" processed successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete company.');
    } finally {
      setDeletingCompany(false);
    }
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchSearch = 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.industry || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = 
        statusFilter === 'ALL' || 
        (c.status || '').toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Active</span>
        </span>
      );
    }
    if (s === 'SUSPENDED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>Suspended</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center w-fit space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        <span>{s}</span>
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Toast Notification */}
      {notification.text && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-lg transition-all animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification({ type: '', text: '' })} className="hover:opacity-75">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Company Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage enterprise client profiles, registered industries, and member personnel.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 w-full md:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Add Company</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by company name, contact email, industry, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#111827] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DEACTIVATED">Deactivated</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Companies Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Location / Address</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-semibold">Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No companies found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                          {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{company.name}</div>
                          <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                            {company.industry && <span>{company.industry}</span>}
                            {company.industry && company.website && <span>&bull;</span>}
                            {company.website && (
                              <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                                {company.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 font-medium">{company.email || 'No email provided'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{company.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 max-w-xs truncate">{company.address || 'Address not specified'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(company.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetails(company)}
                          title="View Company & Personnel"
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>

                        {/* Edit Company */}
                        <button
                          onClick={() => handleOpenEdit(company)}
                          title="Edit Company Details"
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>

                        {/* Suspend / Activate Toggle */}
                        <button
                          onClick={() => handleToggleStatus(company)}
                          title={company.status === 'ACTIVE' ? "Suspend Organization" : "Activate Organization"}
                          className={`p-2 rounded-lg transition-colors ${
                            company.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {company.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </button>

                        {/* Guarded Delete */}
                        <button
                          onClick={() => handleOpenDelete(company)}
                          title="Delete Organization"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

      {/* MODAL 1: VIEW DETAILS & MEMBERS */}
      {isDetailsOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-base">
                  {selectedCompany.name ? selectedCompany.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedCompany.name}</h3>
                  <p className="text-xs text-slate-400">{selectedCompany.industry || 'Enterprise Organization'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Official Email</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedCompany.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Contact Phone</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedCompany.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Website</label>
                  <p className="text-sm font-medium text-white mt-1">
                    {selectedCompany.website ? (
                      <a href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                        {selectedCompany.website}
                      </a>
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Account Status</label>
                  <div className="mt-1">{getStatusBadge(selectedCompany.status)}</div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Headquarters / Address</label>
                  <p className="text-sm text-slate-300 mt-1">{selectedCompany.address || 'Address not specified'}</p>
                </div>
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Registered Personnel / Members</span>
                    <span className="px-2 py-0.5 text-xs bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                      {companyMembers.list.length}
                    </span>
                  </h4>
                </div>

                {companyMembers.loading ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs">Loading company members...</span>
                  </div>
                ) : companyMembers.list.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
                    <p className="text-xs font-medium">No personnel or member accounts currently linked to this organization.</p>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5 font-bold uppercase">Member</th>
                          <th className="px-4 py-2.5 font-bold uppercase">Contact</th>
                          <th className="px-4 py-2.5 font-bold uppercase">Role</th>
                          <th className="px-4 py-2.5 font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {companyMembers.list.map(member => (
                          <tr key={member.id} className="hover:bg-slate-800/30">
                            <td className="px-4 py-2.5">
                              <div className="font-semibold text-white">{member.fullName || member.username}</div>
                              <div className="text-[11px] text-slate-500">@{member.username}</div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">{member.email}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                {member.role}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                member.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD COMPANY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Add New Organization</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. contact@acme.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Fintech, Healthcare"
                    value={addForm.industry}
                    onChange={(e) => setAddForm({ ...addForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555 123 4567"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Website</label>
                <input
                  type="text"
                  placeholder="e.g. acme.com"
                  value={addForm.website}
                  onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Headquarters / Address</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 100 Main St, Suite 400, New York, NY"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                  {savingAdd ? 'Creating Organization...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT COMPANY */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Edit Organization Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Official Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Industry</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Website</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Headquarters / Address</label>
                <textarea
                  rows="2"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GUARDED DELETE */}
      {isDeleteModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Organization</h3>
                <p className="text-xs text-slate-400">Guarded Database Deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-semibold">"{selectedCompany.name}"</strong>?
            </p>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-amber-400 flex items-center space-x-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Relational Integrity Safeguard:</span>
              </div>
              <p>
                If this organization has active employees, products, or license subscriptions, the system will automatically deactivate it rather than breaking enterprise audit records.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCompany}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {deletingCompany && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{deletingCompany ? 'Processing...' : 'Confirm Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
