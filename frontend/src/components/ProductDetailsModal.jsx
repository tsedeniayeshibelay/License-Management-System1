import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function ProductDetailsModal({ product, onClose, isInternal, userRole, onNavigate }) {
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const formatLicenseType = (type) => {
    if (!type) return "Unknown"
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handlePurchase = async () => {
    if (!isInternal) {
      navigate('/login')
      return
    }

    try {
      setLoading(true)
      await api.post(`/licenses/purchase?productId=${product.id}&quantity=${quantity}`)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        if (onNavigate) {
          onNavigate(userRole === 'BULK_BUYER' ? 'orders' : 'dashboard')
        }
        if (userRole === 'CUSTOMER') {
          window.dispatchEvent(new CustomEvent('customer-tab-change', { detail: 'orders' }))
        }
      }, 2000)
    } catch (err) {
      console.error("Purchase failed", err)
      alert("Purchase failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Calculate pricing
  const isBulkBuyer = userRole === 'BULK_BUYER';
  const basePrice = Number(isBulkBuyer ? (product.bulkBuyerPrice || product.price) : (product.customerPrice || product.price)) || 0
  const minQuantity = isBulkBuyer ? (product.minBulkQuantity || 1) : 1
  
  // Ensure quantity respects minimum
  if (isBulkBuyer && quantity < minQuantity && quantity === 1) {
    setQuantity(minQuantity)
  }
  
  const totalPrice = basePrice * quantity

  // License type visual mapping
  const renderPurchaseSection = () => {
    if (!isInternal) {
      return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-4">You must be signed in to purchase or activate licenses.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md w-full transition-colors">
            Sign in to Purchase
          </button>
        </div>
      )
    }

    if (product.licenseType === 'OPEN_SOURCE') {
      return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Open Source</p>
          <p className="text-xs text-slate-500 mb-4">This product is freely available under an open-source license.</p>
          <button className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg font-bold shadow-md w-full transition-colors">
            Get Started (Free)
          </button>
        </div>
      )
    }

    if (userRole === 'COMPANY') {
      return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Product Owner</p>
          <p className="text-xs text-slate-500 mb-4">You own this product. Manage it from your dashboard.</p>
          <button onClick={() => { onClose(); navigate('/dashboard'); }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md w-full transition-colors">
            Manage Product
          </button>
        </div>
      )
    }

    if (userRole === 'BULK_BUYER') {
      return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded">Volume Licensing</span>
            <p className="text-xs text-slate-500 mt-2">Designed for organizations purchasing multiple licenses to distribute to employees.</p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Quantity</label>
            <input 
              type="number" 
              min={minQuantity} 
              value={quantity} 
              onChange={(e) => setQuantity(Math.max(minQuantity, parseInt(e.target.value) || minQuantity))}
              className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-500">Total Price</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${totalPrice.toFixed(2)}</span>
          </div>
          <button 
            onClick={handlePurchase} 
            disabled={loading || success}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md ${
              success ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : success ? 'âœ“ Licenses Provisioned' : `Buy in Bulk (${quantity})`}
          </button>
        </div>
      )
    }

    // Default Customer Flow (PER_USER, PER_DEVICE, SUBSCRIPTION)
    let description = "Standard software license."
    if (product.licenseType === 'PER_USER') description = "License is assigned to a specific user."
    if (product.licenseType === 'PER_DEVICE') description = "License is associated with a specific device."
    if (product.licenseType === 'SUBSCRIPTION') description = "Recurring license subscription."

    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">License Details</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{description}</p>
        </div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Price</span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">${basePrice.toFixed(2)}</span>
            {product.licenseType === 'SUBSCRIPTION' && <span className="text-xs text-slate-500 font-medium ml-1">/year</span>}
          </div>
        </div>
          <button 
            onClick={handlePurchase} 
            disabled={loading || success}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md ${
              success ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : success ? 'Purchase Successful!' : 'Buy License'}
          </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Product Info */}
        <div className="w-full md:w-3/5 p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-400 shadow-inner">
              {product.name ? product.name.charAt(0) : '?'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{product.name || 'Unknown Product'}</h2>
              <p className="text-sm text-slate-500 font-medium">By {product.company?.name || 'Unknown Company'}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {product.description || 'No description provided. This is a powerful software tool built for modern enterprises.'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Version</span>
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200">{product.version || 'v1.0.0'}</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">License Model</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatLicenseType(product.licenseType)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Purchase Flow */}
        <div className="w-full md:w-2/5 p-8 bg-slate-50 dark:bg-slate-950 relative flex flex-col justify-center">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors hidden md:block">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          {renderPurchaseSection()}

        </div>

      </div>
    </div>
  )
}

export default ProductDetailsModal
