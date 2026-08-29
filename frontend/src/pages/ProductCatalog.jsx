import React, { useState, useEffect } from 'react'
import api from '../services/api'
import ProductDetailsModal from '../components/ProductDetailsModal'

function ProductCatalog({ isInternal = false, userRole = null, onNavigate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("All")
  
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const res = await api.get('/products/public')
        setProducts(res.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch public products", err)
        setError("Could not load the product catalog.")
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType !== "All") {
      // License types are usually uppercase enum strings like "PER_USER", "SUBSCRIPTION"
      // We will match string roughly
      if (filterType === 'Per User' && p.licenseType !== 'PER_USER') return false
      if (filterType === 'Per Device' && p.licenseType !== 'PER_DEVICE') return false
      if (filterType === 'Subscription' && p.licenseType !== 'SUBSCRIPTION') return false
      if (filterType === 'Volume' && p.licenseType !== 'VOLUME') return false
      if (filterType === 'Open Source' && p.licenseType !== 'OPEN_SOURCE') return false
    }
    return true
  })

  // Badge Color Map
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'PER_USER': return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
      case 'PER_DEVICE': return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      case 'SUBSCRIPTION': return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800"
      case 'VOLUME': return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
      case 'OPEN_SOURCE': return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    }
  }

  const formatLicenseType = (type) => {
    if (!type) return "Unknown"
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className={`w-full ${!isInternal ? 'max-w-7xl mx-auto px-6 py-12' : 'pb-12'}`}>
      
      {/* Header */}
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Product Catalog</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Discover software products and choose the license that fits your needs.</p>
        </div>
        <div className="relative w-full md:w-72">
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-nowrap overflow-x-auto pb-4 mb-8 gap-2 scrollbar-hide">
        {['All', 'Per User', 'Per Device', 'Subscription', 'Volume', 'Open Source'].map(filter => (
          <button 
            key={filter}
            onClick={() => setFilterType(filter)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
              filterType === filter 
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-72 animate-pulse flex flex-col justify-between">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
              </div>
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-full mt-6"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
          <p className="text-red-500 font-bold">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
          <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No products found</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Try changing your search or filters to discover available software.</p>
          <button onClick={() => { setSearch(''); setFilterType('All'); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-lg transition-colors">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-300/50 dark:border-slate-600/50">
                  {product.name.charAt(0)}
                </div>
                <div className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${getBadgeStyle(product.licenseType)}`}>
                  {formatLicenseType(product.licenseType)}
                </div>
              </div>

              <div className="flex-1 relative z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{product.name}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-3">By {product.company?.name || 'Unknown Company'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {product.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Starting at</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {product.customerPrice > 0 ? `$${product.customerPrice.toFixed(2)}` : (product.price > 0 ? `$${product.price.toFixed(2)}` : 'Free')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedProduct(product)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          isInternal={isInternal}
          userRole={userRole}
          onNavigate={onNavigate}
        />
      )}

    </div>
  )
}

export default ProductCatalog
