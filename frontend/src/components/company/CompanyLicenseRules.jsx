import React, { useState } from 'react'

export default function CompanyLicenseRules({ products = [], setActiveTab }) {
  const [selectedType, setSelectedType] = useState('ALL')

  const RULES_DATA = [
    {
      type: 'PER_DEVICE',
      title: 'Per Device Node-Locked',
      tag: 'Hardware Bound',
      tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: '💻',
      deviceLimit: 'Strictly 1 Device',
      binding: 'Hardware Fingerprint (Machine ID, CPU, Motherboard UUID)',
      expiry: 'Configurable or Perpetual',
      transferRule: 'Requires machine unbind or administrator revocation before re-activation',
      description: 'Locks license activation to a single hardware unit. Ideal for specialized desktop workstations, CAD tools, or offline kiosks.'
    },
    {
      type: 'VOLUME',
      title: 'Volume Multi-Seat',
      tag: 'Enterprise & Teams',
      tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: '🏢',
      deviceLimit: 'Pooled Quota (Seats)',
      binding: 'Dynamic seat allocation across company organization',
      expiry: 'Fixed term or annual renewal',
      transferRule: 'Seats can be reassigned between employees via bulk buyer portal',
      description: 'Enables companies and organizations to purchase a bulk pool of seats and distribute them among staff or managed device clusters.'
    },
    {
      type: 'SUBSCRIPTION',
      title: 'Time-Bound Subscription',
      tag: 'Recurring SaaS',
      tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: '⏱️',
      deviceLimit: 'Configurable per tier',
      binding: 'User or Machine with strict expiration check',
      expiry: 'Strict calendar expiration date',
      transferRule: 'Automatic lockout on expiry date until license renewal is confirmed',
      description: 'Enforces software access based on active billing periods. Validations fail automatically once the subscription expiration timestamp passes.'
    },
    {
      type: 'PER_USER',
      title: 'Named User Identity',
      tag: 'Individual Professional',
      tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: '👤',
      deviceLimit: 'Multi-device (typically 1–3 personal devices)',
      binding: 'User account credentials & JWT identity',
      expiry: 'Configurable',
      transferRule: 'License travels with the user across approved desktop/mobile devices',
      description: 'Binds entitlement to a single human user rather than a specific physical machine. Great for cross-device desktop applications.'
    },
    {
      type: 'OPEN_SOURCE',
      title: 'Open Source / Community',
      tag: 'Unrestricted',
      tagColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: '🌐',
      deviceLimit: 'Unlimited',
      binding: 'None (Honor-based / Telemetry only)',
      expiry: 'Lifetime (Never expires)',
      transferRule: 'Unrestricted execution on any machine or container',
      description: 'Used for free evaluation tiers, open-source modules, or developer previews with zero hardware restriction or expiration checks.'
    }
  ]

  const filteredRules = selectedType === 'ALL' 
    ? RULES_DATA 
    : RULES_DATA.filter(r => r.type === selectedType)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">License Types & Rules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Engine validation policies, hardware locking constraints, seat quotas, and expiration rules.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab && setActiveTab('company-licenses')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Issue License with Rule
        </button>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
        >
          All Types ({RULES_DATA.length})
        </button>
        {RULES_DATA.map(r => (
          <button
            key={r.type}
            onClick={() => setSelectedType(r.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedType === r.type ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
          >
            {r.type}
          </button>
        ))}
      </div>

      {/* RULES CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRules.map((rule) => (
          <div 
            key={rule.type} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                  {rule.icon}
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${rule.tagColor}`}>
                  {rule.tag}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {rule.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
                {rule.description}
              </p>

              {/* RULES SPEC LIST */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 font-medium">Device Quota:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{rule.deviceLimit}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 font-medium">Binding:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{rule.binding}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 font-medium">Expiration Rule:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{rule.expiry}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 font-medium">Transferability:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{rule.transferRule}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                TYPE_{rule.type}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                Engine Enforced
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* PRODUCTS APPLIED SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Products & Assigned License Rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">How your company products map to the licensing engine policies.</p>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('company-products')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Manage Products &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Version</th>
                <th className="px-6 py-3">Default License Type</th>
                <th className="px-6 py-3">Enforcement Mode</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">
                    No products registered yet. Create a product to associate licensing rules.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{prod.name}</td>
                    <td className="px-6 py-3.5 text-slate-500">{prod.version || '1.0.0'}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                        {prod.licenseType || 'VOLUME'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">Online & Offline RSA Verification</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {prod.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
