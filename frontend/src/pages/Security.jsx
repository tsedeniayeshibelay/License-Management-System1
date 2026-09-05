import React from 'react'
import { Link } from 'react-router-dom'

function Security() {
  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">Security at LockStrata</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Security at LockStrata
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium max-w-3xl">
          Designed to keep software licensing controlled, organized, and trustworthy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-3xl mb-4">🔐</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Secure License Management</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Manage licenses through a centralized platform.
          </p>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-3xl mb-4 text-emerald-500">✓</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">License Verification</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Verify license information and status through the platform's licensing process.
          </p>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-3xl mb-4">🛡</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Controlled Activation</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Control how supported licenses are activated.
          </p>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">License Status Tracking</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Track license states such as active, available, expired, or revoked when supported by the system.
          </p>
        </div>
      </div>

      {/* OUR SECURITY APPROACH */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          Our Security Approach
        </h2>
        <div className="prose prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            LockStrata implements necessary security measures to ensure that the process of generating, storing, and validating software licenses is robust and reliable. Our architecture relies on standard security protocols designed for enterprise software licensing.
          </p>
          <ul className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
            <li className="flex items-start">
              <span className="text-blue-500 mr-3 mt-1">●</span>
              <span><strong>Cryptographic Generation:</strong> License keys are generated using cryptographically secure algorithms to prevent unauthorized replication.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3 mt-1">●</span>
              <span><strong>Offline Validation Support:</strong> Offline license activation payloads are cryptographically signed, ensuring that even isolated networks can verify license integrity without exposing the activation process to tampering.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3 mt-1">●</span>
              <span><strong>Role-Based Access Control (RBAC):</strong> Access to dashboards, license generation, and product management is strictly controlled through authenticated sessions and role-based permissions to distinguish between Administrators, Product Owners, and Users.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-3 mt-1">●</span>
              <span><strong>API Rate Limiting:</strong> Endpoints are protected against excessive usage to ensure high availability and prevent brute-force verification attempts.</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  )
}

export default Security
