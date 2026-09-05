import React from 'react'
import { Link } from 'react-router-dom'

function Support() {
  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">Support</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          LockStrata Support
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
          Find help with your account, products, and software licenses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        
        {/* SUPPORT CATEGORIES */}
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">🔑</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">License Activation</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            Troubleshoot license activation problems.
          </p>
          <Link to="/contact" className="text-blue-500 hover:text-blue-400 text-sm font-semibold flex items-center transition-colors">
            Get Activation Help <span className="ml-1">&rarr;</span>
          </Link>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">License Management</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            Get help managing active, expired, or revoked licenses.
          </p>
          <Link to="/contact" className="text-blue-500 hover:text-blue-400 text-sm font-semibold flex items-center transition-colors">
            Get Management Help <span className="ml-1">&rarr;</span>
          </Link>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">🏢</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Bulk Licensing</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            Learn how organizations can manage multiple licenses.
          </p>
          <Link to="/contact" className="text-blue-500 hover:text-blue-400 text-sm font-semibold flex items-center transition-colors">
            Get Organization Help <span className="ml-1">&rarr;</span>
          </Link>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow">
          <div className="text-3xl mb-4">👤</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Account</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            Get help with account and authentication issues.
          </p>
          <Link to="/contact" className="text-blue-500 hover:text-blue-400 text-sm font-semibold flex items-center transition-colors">
            Get Account Help <span className="ml-1">&rarr;</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-slate-200 dark:border-slate-800 pt-16">
        
        {/* STILL NEED HELP */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Still need help?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">Contact our support team directly for assistance.</p>
            <Link to="/contact" className="w-full inline-flex justify-center items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all">
              Contact Support
            </Link>
          </div>
        </div>

        {/* POPULAR QUESTIONS */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Popular Questions</h3>
          <ul className="space-y-4">
            <li>
              <Link to="/faq" className="group flex items-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-blue-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                <span className="font-medium">How do I activate a license?</span>
              </Link>
            </li>
            <li>
              <Link to="/faq" className="group flex items-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-blue-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                <span className="font-medium">What license types are available?</span>
              </Link>
            </li>
            <li>
              <Link to="/faq" className="group flex items-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-blue-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                <span className="font-medium">Can I purchase multiple licenses?</span>
              </Link>
            </li>
            <li>
              <Link to="/faq" className="group flex items-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-blue-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                <span className="font-medium">What happens when my license expires?</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

    </div>
  )
}

export default Support
