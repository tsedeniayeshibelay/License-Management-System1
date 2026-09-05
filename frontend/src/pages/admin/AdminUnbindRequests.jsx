import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AdminUnbindRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/unbind-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch unbind requests', err);
      showNotification('error', 'Failed to load hardware unbind requests.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DETAILS
  const handleOpenDetails = (request) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  // 2. APPROVE ACTION
  const handleOpenApprove = (request) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setApproving(true);
    try {
      const res = await api.post(`/admin/unbind-requests/${selectedRequest.id}/approve`);
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? res.data : r));
      setIsApproveModalOpen(false);
      showNotification('success', 'Hardware unbind request approved and seat released.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setApproving(false);
    }
  };

  // 3. REJECT ACTION
  const handleOpenReject = (request) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    setRejecting(true);
    try {
      const res = await api.post(`/admin/unbind-requests/${selectedRequest.id}/reject`);
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? res.data : r));
      setIsRejectModalOpen(false);
      showNotification('success', 'Hardware unbind request rejected.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setRejecting(false);
    }
  };

  // 4. DELETE / PURGE RECORD
  const handleOpenDelete = (request) => {
    setSelectedRequest(request);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRequest) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/unbind-requests/${selectedRequest.id}`);
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setIsDeleteModalOpen(false);
      showNotification('success', 'Unbind request record removed successfully.');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const devName = r.device?.deviceName || r.deviceName || 'Workstation';
      const userName = r.user?.fullName || r.user?.username || '';
      const userEmail = r.user?.email || '';
      const reason = r.reason || '';
      const prodName = r.license?.product?.name || '';

      const matchSearch =
        devName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prodName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (r.status || '').toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Approved</span>
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center w-fit space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span>Pending Review</span>
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Hardware Unbind Requests</h2>
          <p className="text-sm text-slate-400 mt-1">Review, approve, or reject user workstation dissociation and license seat release requests.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by workstation name, user email, product, or reason..."
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
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Workstation & Product</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Requested By</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Reason Provided</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Submission Date</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs font-semibold">Loading unbind requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No hardware unbind requests found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(request => {
                  const devName = request.device?.deviceName || request.deviceName || 'Workstation';
                  const prodName = request.license?.product?.name || 'Software License';
                  const userName = request.user?.fullName || request.user?.username || 'User';
                  const userEmail = request.user?.email || 'N/A';
                  const isPending = (request.status || '').toUpperCase() === 'PENDING';

                  return (
                    <tr key={request.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          </div>
                          <div>
                            <div className="font-semibold text-white">{devName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{prodName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-300">{userName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{userEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 max-w-xs truncate" title={request.reason}>
                          {request.reason || 'Hardware unbind requested'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => handleOpenDetails(request)}
                            title="View Request Details"
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </button>

                          {isPending ? (
                            <>
                              {/* Approve Button */}
                              <button
                                onClick={() => handleOpenApprove(request)}
                                title="Approve & Release Seat"
                                className="p-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              </button>

                              {/* Reject Button */}
                              <button
                                onClick={() => handleOpenReject(request)}
                                title="Reject Request"
                                className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </>
                          ) : (
                            /* Delete / Purge Record */
                            <button
                              onClick={() => handleOpenDelete(request)}
                              title="Delete Request Record"
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

      {/* MODAL 1: VIEW DETAILS */}
      {isDetailsOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedRequest.device?.deviceName || selectedRequest.deviceName || 'Workstation'}</h3>
                  <p className="text-xs text-slate-400">{selectedRequest.license?.product?.name || 'Software License'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Requesting User</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedRequest.user?.fullName || selectedRequest.user?.username || 'User'}</p>
                  <p className="text-xs text-slate-400">{selectedRequest.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Current Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Operating System</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedRequest.device?.osName || 'Multi-platform'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Submission Timestamp</label>
                  <p className="text-xs font-medium text-slate-300 mt-1">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                {selectedRequest.resolvedAt && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Resolution Timestamp</label>
                    <p className="text-xs font-medium text-slate-300 mt-1">{formatDate(selectedRequest.resolvedAt)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">User Explanation & Reason</label>
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-sm text-slate-300 leading-relaxed">
                  {selectedRequest.reason || 'Hardware unbind requested by user.'}
                </div>
              </div>
            </div>

            {/* Footer */}
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

      {/* MODAL 2: APPROVE REQUEST */}
      {isApproveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Approve Unbind Request</h3>
                <p className="text-xs text-slate-400">Hardware Seat Dissociation</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to approve hardware unbind for <strong className="text-white font-semibold">"{selectedRequest.device?.deviceName || selectedRequest.deviceName || 'Workstation'}"</strong>?
            </p>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <p className="text-emerald-400 font-semibold">Seat Release Effect:</p>
              <p>The license activation linked to this hardware will be deactivated immediately, freeing up 1 seat in the customer's entitlement pool.</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleConfirmApprove}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {approving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{approving ? 'Approving...' : 'Confirm Approval'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT REQUEST */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Unbind Request</h3>
                <p className="text-xs text-slate-400">Deny Dissociation Request</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to reject the unbind request for <strong className="text-white font-semibold">"{selectedRequest.device?.deviceName || selectedRequest.deviceName || 'Workstation'}"</strong>?
            </p>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-400">
              The user will be notified that their request was rejected, and the device will remain bound to the license.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmReject}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {rejecting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{rejecting ? 'Rejecting...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE / PURGE */}
      {isDeleteModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Request Record</h3>
                <p className="text-xs text-slate-400">Purge Processed Audit Entry</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this processed unbind request record?
            </p>

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
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{deleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
