import React from 'react';

export default function AdminAlerts() {
  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Alerts</h2>
        <p className="text-sm text-slate-400 mt-1">Manage platform notifications and threshold alerts.</p>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6 border border-slate-700/50 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Alert Rules Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          The Alerts Management API is not currently supported by the backend system.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors opacity-50 cursor-not-allowed">
          Create Alert (Disabled)
        </button>
      </div>
    </div>
  );
}
