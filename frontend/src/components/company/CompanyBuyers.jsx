import React, { useState, useMemo } from 'react'
import CompanyBuyerDetailsModal from './CompanyBuyerDetailsModal'

export default function CompanyBuyers({ licenses }) {
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  // Derive unique buyers from the issued licenses
  const buyers = useMemo(() => {
    const map = new Map()
    licenses.forEach(l => {
      const id = l.user?.id || l.userId || (l.company && l.company.id) || l.companyId
      if (id) {
        if (!map.has(id)) {
          const name = l.customerName || l.user?.name || l.user?.fullName || l.user?.username || l.company?.name || `Customer #${id}`
          const email = l.customerEmail || l.user?.email || ''
          const role = l.user?.role || (l.user ? 'CUSTOMER' : 'BUYER')
          const companyName = l.company?.name || l.user?.company || ''
          map.set(id, {
            id,
            name,
            username: l.user?.username,
            email,
            role,
            company: companyName,
            totalLicenses: 0,
            activeLicenses: 0,
            licenses: []
          })
        }
        const b = map.get(id)
        b.totalLicenses++
        if (l.status === 'ACTIVE') b.activeLicenses++
        b.licenses.push(l)
      }
    })
    return Array.from(map.values()).sort((a, b) => b.totalLicenses - a.totalLicenses)
  }, [licenses])

  const handleOpenDetails = (buyer) => {
    setSelectedBuyer(buyer)
    setIsDetailsOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">License Holders</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organizations and users who have purchased your products.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Organization / User</th>
                <th className="px-6 py-4 text-center">Total Licenses</th>
                <th className="px-6 py-4 text-center">Active Licenses</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    <p className="mb-2">No buyers found yet.</p>
                    <p className="text-xs">Once you issue licenses, the holders will appear here.</p>
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                          {(buyer.company || buyer.name || buyer.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{buyer.company || buyer.name || buyer.username}</p>
                          <p className="text-xs text-slate-500">{buyer.email || 'No email provided'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{buyer.totalLicenses}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {buyer.activeLicenses} Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenDetails(buyer)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holder Details Modal */}
      <CompanyBuyerDetailsModal
        buyer={selectedBuyer}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  )
}
