import React from 'react';

export default function AdminLicenseTypes() {
  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">License Types & Rules</h2>
        <p className="text-sm text-slate-400 mt-1">Configure global templates, limits, and rules for new licenses.</p>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6 border border-slate-700/50 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Configuration Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          The Global License Types API is not currently available in the backend system. 
          License types are currently managed dynamically per-product via the Product Controller.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors opacity-50 cursor-not-allowed">
          Manage Rules (Disabled)
        </button>
      </div>
    </div>
  );
}
