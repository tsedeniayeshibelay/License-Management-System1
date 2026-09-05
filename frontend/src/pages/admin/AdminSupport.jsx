import React from 'react';

export default function AdminSupport() {
  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Support Tickets</h2>
        <p className="text-sm text-slate-400 mt-1">Manage and resolve customer support inquiries.</p>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6 border border-slate-700/50 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Ticketing System Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          The internal Support Ticketing API is not currently integrated. Please manage support requests through your external Helpdesk provider.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors opacity-50 cursor-not-allowed">
          Open Integration Settings (Disabled)
        </button>
      </div>
    </div>
  );
}
