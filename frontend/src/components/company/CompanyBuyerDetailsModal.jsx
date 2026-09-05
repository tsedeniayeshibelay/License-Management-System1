import React from 'react'

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export default function CompanyBuyerDetailsModal({ buyer, isOpen, onClose }) {
  if (!isOpen || !buyer) return null

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Expired</span>
      case 'REVOKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Revoked</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{status || 'INACTIVE'}</span>
    }
  }

  const licenses = buyer.licenses || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              {(buyer.company || buyer.name || buyer.username || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {buyer.company || buyer.name || buyer.username || 'License Holder'}
                </h3>
                {buyer.role && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {buyer.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {buyer.email || 'No email provided'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Licenses</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{buyer.totalLicenses}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{buyer.activeLicenses}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Inactive / Other</span>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{buyer.totalLicenses - buyer.activeLicenses}</p>
            </div>
          </div>

          {/* LICENSES LIST */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Issued Licenses ({licenses.length})
            </h4>

            {licenses.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No licenses associated with this holder.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Expires On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                      {licenses.map((lic) => {
                        const prodName = lic.productName || lic.product?.name || 'Software Product'
                        const exp = safeDate(lic.expiryDate)
                        return (
                          <tr key={lic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-200">
                              {prodName}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {lic.licenseType || 'Standard'}
                            </td>
                            <td className="px-4 py-2.5">
                              {getStatusBadge(lic.status)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500">
                              {exp ? exp.toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
