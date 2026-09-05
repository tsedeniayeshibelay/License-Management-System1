import React, { useState } from 'react'
import api from '../../services/api'

export default function CompanyProductWizard({ initialProduct = null, onComplete, onCancel }) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Read company default product preferences
  const getSavedProductPrefs = () => {
    try {
      const raw = localStorage.getItem('company_product_prefs')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }
  const defaultPrefs = getSavedProductPrefs()
  const defaultAvailCust = defaultPrefs?.defaultVisibility === 'Private' ? false : true
  const defaultAvailBulk = defaultPrefs?.defaultVisibility === 'Private' ? false : true
  const defaultStatus = defaultPrefs?.defaultStatus ? defaultPrefs.defaultStatus.toUpperCase() : 'ACTIVE'

  const [productData, setProductData] = useState({
    name: initialProduct?.name || '',
    productIdSku: initialProduct?.productIdSku || '',
    version: initialProduct?.version || '',
    description: initialProduct?.description || '',
    category: initialProduct?.category || '',
    publisher: initialProduct?.publisher || '',
    supportedOs: initialProduct?.supportedOs || 'Windows',
    distributionMethod: 'EXTERNAL',
    downloadUrl: '',
    releaseFile: null,
    releaseNotes: '',
    customerPrice: initialProduct?.customerPrice || 0,
    bulkBuyerPrice: initialProduct?.bulkBuyerPrice || 0,
    minBulkQuantity: initialProduct?.minBulkQuantity || 10,
    availableToCustomers: initialProduct?.availableToCustomers ?? defaultAvailCust,
    availableToBulkBuyers: initialProduct?.availableToBulkBuyers ?? defaultAvailBulk,
    status: initialProduct?.status || defaultStatus,
    licenseType: initialProduct?.licenseType || 'STANDARD'
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const updateData = (fields) => setProductData(prev => ({...prev, ...fields}))
  
  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (initialProduct) {
        // Edit mode
        await api.put(`/products/${initialProduct.id}`, {
          name: productData.name,
          productIdSku: productData.productIdSku,
          description: productData.description,
          category: productData.category,
          publisher: productData.publisher,
          supportedOs: productData.supportedOs,
          customerPrice: productData.customerPrice,
          bulkBuyerPrice: productData.bulkBuyerPrice,
          minBulkQuantity: productData.minBulkQuantity,
          availableToCustomers: productData.availableToCustomers,
          availableToBulkBuyers: productData.availableToBulkBuyers,
          licenseType: productData.licenseType
        })
      } else {
        // 1. Create Product
        const prodRes = await api.post('/products', {
          name: productData.name,
          productIdSku: productData.productIdSku,
          version: productData.version,
          description: productData.description,
          category: productData.category,
          publisher: productData.publisher,
          supportedOs: productData.supportedOs,
          customerPrice: productData.customerPrice,
          bulkBuyerPrice: productData.bulkBuyerPrice,
          minBulkQuantity: productData.minBulkQuantity,
          availableToCustomers: productData.availableToCustomers,
          availableToBulkBuyers: productData.availableToBulkBuyers,
          status: productData.status,
          licenseType: productData.licenseType
        })
        const createdProduct = prodRes.data

        // 2. Create Initial Release
        if (productData.distributionMethod === 'EXTERNAL') {
          await api.post('/releases/external', {
            productId: createdProduct.id,
            version: productData.version,
            downloadUrl: productData.downloadUrl,
            releaseNotes: productData.releaseNotes,
            isCritical: false
          })
        } else {
          const formData = new FormData()
          formData.append('release', new Blob([JSON.stringify({
            productId: createdProduct.id,
            version: productData.version,
            releaseNotes: productData.releaseNotes,
            isCritical: false
          })], { type: 'application/json' }))
          
          formData.append('file', productData.releaseFile)
          
          await api.post('/releases/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              setUploadProgress(percentCompleted)
            }
          })
        }

        // 3. Publish Product
        await api.post(`/products/${createdProduct.id}/publish`)
      }
      
      onComplete()
    } catch (err) {
      console.error("Failed to save product", err)
      alert("An error occurred during save. Check console for details.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{initialProduct ? 'Edit Software' : 'Register Software'}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {/* Stepper */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className={step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>1. Info</span>
            <span className="text-slate-300 dark:text-slate-600">&rarr;</span>
            <span className={step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>2. Distribution</span>
            <span className="text-slate-300 dark:text-slate-600">&rarr;</span>
            <span className={step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>3. Pricing</span>
            <span className="text-slate-300 dark:text-slate-600">&rarr;</span>
            <span className={step >= 4 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>4. Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Product Name</label>
                  <input type="text" value={productData.name} onChange={e => updateData({name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">SKU / Product ID</label>
                  <input type="text" value={productData.productIdSku} onChange={e => updateData({productIdSku: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
                </div>
                {!initialProduct && (
                  <div>
                    <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Initial Version</label>
                    <input type="text" value={productData.version} onChange={e => updateData({version: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Category (License Type)</label>
                  <select value={productData.category} onChange={e => updateData({category: e.target.value, licenseType: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white">
                    <option value="">Select License Type</option>
                    <option value="PER_USER">Per User</option>
                    <option value="PER_DEVICE">Per Device</option>
                    <option value="SUBSCRIPTION">Subscription</option>
                    <option value="VOLUME">Volume</option>
                    <option value="OPEN_SOURCE">Open Source</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Publisher</label>
                  <input type="text" value={productData.publisher} onChange={e => updateData({publisher: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Supported OS</label>
                  <select value={productData.supportedOs} onChange={e => updateData({supportedOs: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white">
                    <option value="Windows">Windows</option>
                    <option value="macOS">macOS</option>
                    <option value="Linux">Linux</option>
                    <option value="Cross-Platform">Cross-Platform</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Description</label>
                <textarea rows="3" value={productData.description} onChange={e => updateData({description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
              </div>
            </div>
          )}

          {step === 2 && !initialProduct && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-slate-300">Choose Distribution Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => updateData({distributionMethod: 'EXTERNAL'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${productData.distributionMethod === 'EXTERNAL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">External Hosting</h4>
                    <p className="text-xs text-slate-500">Provide a URL. We redirect buyers to download from your servers.</p>
                  </div>
                  <div 
                    onClick={() => updateData({distributionMethod: 'LOCKSTRATA'})}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${productData.distributionMethod === 'LOCKSTRATA' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">LockStrata Hosting</h4>
                    <p className="text-xs text-slate-500">Upload to our secure servers. We handle distribution securely.</p>
                  </div>
                </div>
              </div>

              {productData.distributionMethod === 'EXTERNAL' && (
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Download URL</label>
                  <input type="url" value={productData.downloadUrl} onChange={e => updateData({downloadUrl: e.target.value})} placeholder="https://yourcompany.com/download/app.exe" className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
                </div>
              )}

              {productData.distributionMethod === 'LOCKSTRATA' && (
                <div>
                  <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Upload Installer (EXE, MSI, ZIP)</label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      onChange={e => updateData({releaseFile: e.target.files[0]})}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-indigo-500 mb-2">
                        <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {productData.releaseFile ? productData.releaseFile.name : 'Click to Browse or Drag & Drop'}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">Maximum file size: 500MB</p>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1 dark:text-slate-300">Release Notes (Optional)</label>
                <textarea rows="3" value={productData.releaseNotes} onChange={e => updateData({releaseNotes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" />
              </div>
            </div>
          )}
          {step === 2 && initialProduct && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex items-center justify-center h-full">
              <p className="text-slate-500">Distribution settings cannot be changed during product edit. Please manage releases separately.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 border-b dark:border-slate-800 pb-2">Availability & Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">For Individual Customers</span>
                    <input type="checkbox" checked={productData.availableToCustomers} onChange={e => updateData({availableToCustomers: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  </div>
                  <label className="block text-xs font-semibold mb-1 dark:text-slate-300">Price (USD)</label>
                  <input type="number" disabled={!productData.availableToCustomers} value={productData.customerPrice} onChange={e => updateData({customerPrice: parseFloat(e.target.value)})} className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50" />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">For Bulk Buyers</span>
                    <input type="checkbox" checked={productData.availableToBulkBuyers} onChange={e => updateData({availableToBulkBuyers: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-slate-300">Price (USD)</label>
                      <input type="number" disabled={!productData.availableToBulkBuyers} value={productData.bulkBuyerPrice} onChange={e => updateData({bulkBuyerPrice: parseFloat(e.target.value)})} className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 dark:text-slate-300">Min. Quantity</label>
                      <input type="number" disabled={!productData.availableToBulkBuyers} value={productData.minBulkQuantity} onChange={e => updateData({minBulkQuantity: parseInt(e.target.value)})} className="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white border-b dark:border-slate-700 pb-2">Review & Publish</h4>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><span className="text-slate-500">Name:</span> <span className="font-medium dark:text-white">{productData.name}</span></div>
                  <div><span className="text-slate-500">SKU:</span> <span className="font-medium dark:text-white">{productData.productIdSku}</span></div>
                  <div><span className="text-slate-500">Version:</span> <span className="font-medium dark:text-white">{productData.version}</span></div>
                  <div><span className="text-slate-500">Platform:</span> <span className="font-medium dark:text-white">{productData.supportedOs}</span></div>
                  <div><span className="text-slate-500">Distribution:</span> <span className="font-medium dark:text-white">{productData.distributionMethod}</span></div>
                  
                  {productData.availableToCustomers && (
                    <div><span className="text-slate-500">Customer Price:</span> <span className="font-medium dark:text-white">${productData.customerPrice}</span></div>
                  )}
                  {productData.availableToBulkBuyers && (
                    <div><span className="text-slate-500">Bulk Price:</span> <span className="font-medium dark:text-white">${productData.bulkBuyerPrice} (Min {productData.minBulkQuantity})</span></div>
                  )}
                </div>
              </div>

              {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="pt-4">
                  <div className="flex justify-between text-xs mb-1 font-medium dark:text-slate-300">
                    <span>Uploading Installer...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-900 shrink-0 rounded-b-2xl">
          <button 
            type="button" 
            onClick={step === 1 ? onCancel : prevStep} 
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 4 ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md"
            >
              Continue
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</>
              ) : (initialProduct ? 'Save Changes' : 'Publish Product')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
