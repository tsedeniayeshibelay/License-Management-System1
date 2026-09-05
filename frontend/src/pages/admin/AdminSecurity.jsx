import React from 'react';

export default function AdminSecurity() {
  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Security Center</h2>
        <p className="text-sm text-slate-400 mt-1">Monitor threats, invalid access attempts, and audit logs.</p>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6 border border-slate-700/50 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Security Event Monitoring Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          The Security API endpoint does not exist yet. Real-time security events and intrusion detection monitoring are not supported in the current backend version.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors opacity-50 cursor-not-allowed">
          View Audit Logs (Disabled)
        </button>
      </div>
    </div>
  );
}
