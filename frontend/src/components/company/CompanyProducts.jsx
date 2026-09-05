import React, { useState } from 'react'
import api from '../../services/api'
import CompanyProductWizard from './CompanyProductWizard'

export default function CompanyProducts({ products, fetchProducts }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const handleWizardComplete = () => {
    setShowAddModal(false)
    setEditingProduct(null)
    if (fetchProducts) fetchProducts()
  }

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    try {
      await api.delete(`/products/${productId}`);
      if (fetchProducts) fetchProducts();
    } catch (err) {
      console.error("Failed to delete product", err);
      alert("Failed to delete product. It might have active licenses.");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your software portfolio and pricing.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Register Software
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    <p className="mb-2">No products found.</p>
                    <button onClick={() => setShowAddModal(true)} className="text-indigo-600 hover:text-indigo-500 font-medium">Register your first software product</button>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{product.productIdSku}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{product.category || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {product.status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Published
                        </span>
                      ) : product.status === 'ARCHIVED' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => { setEditingProduct(product); setShowAddModal(true); }} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm">Edit</button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <CompanyProductWizard 
          initialProduct={editingProduct}
          onComplete={handleWizardComplete} 
          onCancel={() => {
            setShowAddModal(false)
            setEditingProduct(null)
          }} 
        />
      )}
    </div>
  )
}
