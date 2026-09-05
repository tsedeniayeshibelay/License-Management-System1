import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    companyId: '',
    name: '',
    version: '1.0.0',
    category: 'Software',
    licenseType: 'PERPETUAL',
    price: '',
    customerPrice: '',
    bulkBuyerPrice: '',
    minBulkQuantity: 5,
    maxActivations: 1,
    supportedOs: 'Windows, Linux, macOS',
    publisher: '',
    description: '',
    availableToCustomers: true,
    availableToBulkBuyers: false,
    status: 'PUBLISHED'
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    version: '',
    category: '',
    licenseType: 'PERPETUAL',
    price: '',
    customerPrice: '',
    bulkBuyerPrice: '',
    minBulkQuantity: 5,
    maxActivations: 1,
    supportedOs: '',
    publisher: '',
    description: '',
    availableToCustomers: true,
    availableToBulkBuyers: false
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 4000);
  };

  const fetchData = async () => {
    try {
      const [prodRes, compRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/companies')
      ]);
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)) {
        setProducts(prodRes.value.data);
      }
      if (compRes.status === 'fulfilled' && Array.isArray(compRes.value.data)) {
        setCompanies(compRes.value.data);
        if (compRes.value.data.length > 0 && !addForm.companyId) {
          setAddForm(prev => ({ ...prev, companyId: compRes.value.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load products data', err);
      showNotification('error', 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW DETAILS
  const handleOpenDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  // 2. ADD PRODUCT
  const handleOpenAdd = () => {
    setAddForm({
      companyId: companies.length > 0 ? companies[0].id : '',
      name: '',
      version: '1.0.0',
      category: 'Software',
      licenseType: 'PERPETUAL',
      price: '',
      customerPrice: '',
      bulkBuyerPrice: '',
      minBulkQuantity: 5,
      maxActivations: 1,
      supportedOs: 'Windows, Linux, macOS',
      publisher: '',
      description: '',
      availableToCustomers: true,
      availableToBulkBuyers: false,
      status: 'PUBLISHED'
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showNotification('error', 'Product name is required.');
      return;
    }
    if (!addForm.companyId) {
      showNotification('error', 'Please select an organization for this product.');
      return;
    }
    setSavingAdd(true);
    try {
      const payload = {
        ...addForm,
        companyId: Number(addForm.companyId),
        price: addForm.price ? parseFloat(addForm.price) : 0.0,
        customerPrice: addForm.customerPrice ? parseFloat(addForm.customerPrice) : (addForm.price ? parseFloat(addForm.price) : 0.0),
        bulkBuyerPrice: addForm.bulkBuyerPrice ? parseFloat(addForm.bulkBuyerPrice) : (addForm.price ? parseFloat(addForm.price) : 0.0),
        minBulkQuantity: Number(addForm.minBulkQuantity) || 1,
        maxActivations: Number(addForm.maxActivations) || 1
      };
      const res = await api.post('/products', payload);
      setProducts(prev => [res.data, ...prev]);
      setIsAddModalOpen(false);
      showNotification('success', `Product "${res.data.name}" registered successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to create product.');
    } finally {
      setSavingAdd(false);
    }
  };

  // 3. EDIT PRODUCT
  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name || '',
      version: product.version || '1.0.0',
      category: product.category || 'Software',
      licenseType: product.licenseType || 'PERPETUAL',
      price: product.price ?? '',
      customerPrice: product.customerPrice ?? '',
      bulkBuyerPrice: product.bulkBuyerPrice ?? '',
      minBulkQuantity: product.minBulkQuantity ?? 5,
      maxActivations: product.maxActivations ?? 1,
      supportedOs: product.supportedOs || 'Windows, Linux, macOS',
      publisher: product.publisher || '',
      description: product.description || '',
      availableToCustomers: product.availableToCustomers ?? true,
      availableToBulkBuyers: product.availableToBulkBuyers ?? false
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!editForm.name.trim()) {
      showNotification('error', 'Product name is required.');
      return;
    }
    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        price: editForm.price !== '' ? parseFloat(editForm.price) : 0.0,
        customerPrice: editForm.customerPrice !== '' ? parseFloat(editForm.customerPrice) : 0.0,
        bulkBuyerPrice: editForm.bulkBuyerPrice !== '' ? parseFloat(editForm.bulkBuyerPrice) : 0.0,
        minBulkQuantity: Number(editForm.minBulkQuantity) || 1,
        maxActivations: Number(editForm.maxActivations) || 1
      };
      const res = await api.put(`/products/${selectedProduct.id}`, payload);
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? res.data : p));
      setIsEditModalOpen(false);
      showNotification('success', `Product "${res.data.name}" updated successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update product.');
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. PUBLISH / ARCHIVE TOGGLE
  const handleTogglePublish = async (product) => {
    const isPublished = (product.status || '').toUpperCase() === 'PUBLISHED';
    const action = isPublished ? 'archive' : 'publish';
    const confirmMsg = isPublished
      ? `Archive product "${product.name}"? It will no longer be available for new catalog purchases.`
      : `Publish product "${product.name}" to the marketplace catalog?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = isPublished
        ? await api.post(`/products/${product.id}/archive`)
        : await api.post(`/products/${product.id}/publish`);

      setProducts(prev => prev.map(p => p.id === product.id ? res.data : p));
      showNotification('success', `Product "${product.name}" is now ${res.data.status.toLowerCase()}.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || `Failed to ${action} product.`);
    }
  };

  // 5. GUARDED DELETE
  const handleOpenDelete = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    setDeletingProduct(true);
    try {
      await api.delete(`/products/${selectedProduct.id}`);
      // Refresh to observe if soft-archived or deleted
      const res = await api.get('/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
      setIsDeleteModalOpen(false);
      showNotification('success', `Product "${selectedProduct.name}" processed successfully.`);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeletingProduct(false);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.publisher || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.version || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supportedOs || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (p.status || '').toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    const s = (status || 'DRAFT').toUpperCase();
    if (s === 'PUBLISHED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Published</span>
        </span>
      );
    }
    if (s === 'ARCHIVED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-700/50 text-slate-400 border-slate-700 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span>Archived</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-sky-500/10 text-sky-400 border-sky-500/20 flex items-center w-fit space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
        <span>Draft</span>
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Software Products & Catalog</h2>
          <p className="text-sm text-slate-400 mt-1">Manage catalog software titles, pricing models, release versions, and licensing availability.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 w-full md:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Register Product</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products by name, publisher, or operating system..."
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
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Products Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Version & License</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Pricing Structure</th>
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
                      <span className="text-xs font-semibold">Loading product catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold">No products found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-white">{product.name}</div>
                          {product.publisher && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              by {product.publisher}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-slate-300 font-semibold">{product.version || 'v1.0.0'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {product.licenseType || 'PERPETUAL'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                        {product.supportedOs || 'Multi-platform'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-emerald-400 font-bold text-sm">
                        ${Number(product.price ?? 0).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 space-x-2">
                        <span>Customer: ${Number(product.customerPrice ?? product.price ?? 0).toFixed(2)}</span>
                        <span>&bull;</span>
                        <span>Bulk: ${Number(product.bulkBuyerPrice ?? product.price ?? 0).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetails(product)}
                          title="View Product Details"
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>

                        {/* Edit Product */}
                        <button
                          onClick={() => handleOpenEdit(product)}
                          title="Edit Product"
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>

                        {/* Publish / Archive Toggle */}
                        <button
                          onClick={() => handleTogglePublish(product)}
                          title={(product.status || '').toUpperCase() === 'PUBLISHED' ? "Archive from Catalog" : "Publish to Catalog"}
                          className={`p-2 rounded-lg transition-colors ${
                            (product.status || '').toUpperCase() === 'PUBLISHED'
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {(product.status || '').toUpperCase() === 'PUBLISHED' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          )}
                        </button>

                        {/* Guarded Delete */}
                        <button
                          onClick={() => handleOpenDelete(product)}
                          title="Delete Product"
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

      {/* MODAL 1: VIEW DETAILS */}
      {isDetailsOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedProduct.name}</h3>
                  <p className="text-xs text-slate-400">{selectedProduct.version || 'v1.0.0'}{selectedProduct.publisher ? ` • by ${selectedProduct.publisher}` : ''}</p>
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
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Overview Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">License Model</label>
                  <p className="text-sm font-semibold text-indigo-400 mt-1">{selectedProduct.licenseType || 'PERPETUAL'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Catalog Status</label>
                  <div className="mt-1">{getStatusBadge(selectedProduct.status)}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Publisher / Vendor</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedProduct.publisher || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Max Activations Per Seat</label>
                  <p className="text-sm font-medium text-white mt-1">{selectedProduct.maxActivations || 1} device(s)</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Supported Operating Systems</label>
                  <p className="text-sm text-slate-300 mt-1">{selectedProduct.supportedOs || 'Multi-platform'}</p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pricing & Purchase Tiers</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Base Standard</span>
                    <span className="text-base font-bold text-emerald-400 mt-1 block">${Number(selectedProduct.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer Retail</span>
                    <span className="text-base font-bold text-emerald-400 mt-1 block">${Number(selectedProduct.customerPrice ?? selectedProduct.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bulk Buyer Tier</span>
                    <span className="text-base font-bold text-emerald-400 mt-1 block">${Number(selectedProduct.bulkBuyerPrice ?? selectedProduct.price ?? 0).toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Min qty: {selectedProduct.minBulkQuantity || 1}</span>
                  </div>
                </div>
              </div>

              {/* Description & Availability Flags */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Product Description</label>
                  <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed">
                    {selectedProduct.description || 'No detailed description provided for this software release.'}
                  </div>
                </div>

                <div className="flex items-center space-x-6 pt-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedProduct.availableToCustomers ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                    <span className="text-xs text-slate-300">Available to Individual Customers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedProduct.availableToBulkBuyers ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                    <span className="text-xs text-slate-300">Available to Enterprise Bulk Buyers</span>
                  </div>
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

      {/* MODAL 2: REGISTER PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Register Software Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Publishing Organization *</label>
                <select
                  required
                  value={addForm.companyId}
                  onChange={(e) => setAddForm({ ...addForm, companyId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Organization</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CloudDefense Agent"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0.0"
                    value={addForm.version}
                    onChange={(e) => setAddForm({ ...addForm, version: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">License Model *</label>
                <select
                  value={addForm.licenseType}
                  onChange={(e) => setAddForm({ ...addForm, licenseType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PERPETUAL">Perpetual</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="NODE_LOCKED">Node-Locked</option>
                  <option value="TRIAL">Trial</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Customer Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.customerPrice}
                    onChange={(e) => setAddForm({ ...addForm, customerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Bulk Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.bulkBuyerPrice}
                    onChange={(e) => setAddForm({ ...addForm, bulkBuyerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Publisher / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Software Inc"
                    value={addForm.publisher}
                    onChange={(e) => setAddForm({ ...addForm, publisher: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Supported Platforms</label>
                  <input
                    type="text"
                    placeholder="e.g. Windows, macOS, Linux"
                    value={addForm.supportedOs}
                    onChange={(e) => setAddForm({ ...addForm, supportedOs: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows="2"
                  placeholder="Overview of capabilities and features..."
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-6 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.availableToCustomers}
                    onChange={(e) => setAddForm({ ...addForm, availableToCustomers: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">Available to Individual Customers</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.availableToBulkBuyers}
                    onChange={(e) => setAddForm({ ...addForm, availableToBulkBuyers: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">Available to Bulk Buyers</span>
                </label>
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
                  {savingAdd ? 'Registering...' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCT */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit Software Product</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Version</label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">License Model</label>
                <select
                  value={editForm.licenseType}
                  onChange={(e) => setEditForm({ ...editForm, licenseType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PERPETUAL">Perpetual</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="NODE_LOCKED">Node-Locked</option>
                  <option value="TRIAL">Trial</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Customer Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.customerPrice}
                    onChange={(e) => setEditForm({ ...editForm, customerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Bulk Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.bulkBuyerPrice}
                    onChange={(e) => setEditForm({ ...editForm, bulkBuyerPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Publisher / Vendor</label>
                  <input
                    type="text"
                    value={editForm.publisher}
                    onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Supported Platforms</label>
                  <input
                    type="text"
                    value={editForm.supportedOs}
                    onChange={(e) => setEditForm({ ...editForm, supportedOs: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-6 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.availableToCustomers}
                    onChange={(e) => setEditForm({ ...editForm, availableToCustomers: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">Available to Individual Customers</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.availableToBulkBuyers}
                    onChange={(e) => setEditForm({ ...editForm, availableToBulkBuyers: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-300">Available to Bulk Buyers</span>
                </label>
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
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Product</h3>
                <p className="text-xs text-slate-400">Guarded Catalog Removal</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-semibold">"{selectedProduct.name}"</strong>?
            </p>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-amber-400 flex items-center space-x-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Relational Guard:</span>
              </div>
              <p>
                If customers or organizations currently hold active license entitlements for this product, it will be safely archived instead of violating foreign key relationships.
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
                disabled={deletingProduct}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {deletingProduct && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{deletingProduct ? 'Processing...' : 'Confirm Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
