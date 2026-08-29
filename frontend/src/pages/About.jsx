import React from 'react'
import { Link } from 'react-router-dom'

function About() {
  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">About LockStrata</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          About LockStrata
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
          Secure software licensing made simple.
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none mb-16">
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          LockStrata is a software licensing platform designed to make discovering, activating, and managing software licenses simple and secure.
        </p>
      </div>

      {/* WHAT LOCKSTRATA DOES */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          What LockStrata Does
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Product Discovery</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Explore software products and find the license model that fits your needs.
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">License Management</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Manage software licenses from a centralized platform.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">License Activation</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Activate supported software licenses through a controlled process.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">License Tracking</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Track license status and important license information.
            </p>
          </div>
        </div>
      </div>

      {/* BUILT FOR DIFFERENT LICENSING NEEDS */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          Built for Different Licensing Needs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Private Customer</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Purchase software for personal use and manage your own licenses.
            </p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Bulk Buyer Company</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Purchase multiple licenses for an organization and manage them centrally.
            </p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Product Owner Company</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Create software products and manage licenses issued to customers.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

export default About
