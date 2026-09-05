import React, { useState } from 'react';
import api from '../../services/api';

export default function AdminReports() {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);

  const downloadFile = (data, filename) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPdf = async () => {
    setLoadingPdf(true);
    try {
      const response = await api.get('/licenses/export/pdf', { responseType: 'blob' });
      downloadFile(response.data, 'admin_dashboard_report.pdf');
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Failed to generate PDF report.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setLoadingCsv(true);
    try {
      const response = await api.get('/licenses/export/csv', { responseType: 'blob' });
      downloadFile(response.data, 'admin_dashboard_report.csv');
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to generate CSV report.');
    } finally {
      setLoadingCsv(false);
    }
  };

  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Data Exports & Reports</h2>
        <p className="text-sm text-slate-400 mt-1">Generate and download comprehensive system reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PDF Export Card */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col items-center text-center hover:border-slate-700 transition-colors">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Executive Summary (PDF)</h3>
          <p className="text-sm text-slate-400 mb-6">
            A formatted, print-ready document containing high-level KPIs, license distributions, and system health status.
          </p>
          <button 
            onClick={handleExportPdf}
            disabled={loadingPdf}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loadingPdf ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Generating...</>
            ) : (
              'Download PDF Report'
            )}
          </button>
        </div>

        {/* CSV Export Card */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-6 flex flex-col items-center text-center hover:border-slate-700 transition-colors">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Raw Data Dump (CSV)</h3>
          <p className="text-sm text-slate-400 mb-6">
            A spreadsheet-compatible raw data export containing detailed records of users, companies, and licenses.
          </p>
          <button 
            onClick={handleExportCsv}
            disabled={loadingCsv}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loadingCsv ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Generating...</>
            ) : (
              'Download CSV Data'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
