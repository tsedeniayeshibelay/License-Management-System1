import React from 'react';

export default function AdminSystemConfiguration() {
  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Configuration</h2>
        <p className="text-sm text-slate-400 mt-1">Global platform settings and environment variables.</p>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-6 border border-slate-700/50 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Configuration API Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          The System Configuration API is not currently available. Environment variables and global properties must be managed directly via Spring Boot application.yml.
        </p>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors opacity-50 cursor-not-allowed">
          Edit Variables (Disabled)
        </button>
      </div>
    </div>
  );
}
