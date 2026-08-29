import React, { useState } from 'react'
import { Link } from 'react-router-dom'

function Contact() {
  const [status, setStatus] = useState('idle') // idle, submitting, success

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('submitting')
    // Simulate network request
    setTimeout(() => {
      setStatus('success')
    }, 1500)
  }

  return (
    <div className="w-full min-h-screen pt-8 pb-24 px-6 lg:px-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-12">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
          <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900 dark:text-white">Contact LockStrata</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Contact LockStrata
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
          Have a question about software licensing? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* CONTACT FORM */}
        <div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
            {status === 'success' ? (
              <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                  Thank you for reaching out. Our support team will get back to you shortly.
                </p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                >
                  Send another message &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                  <input required type="text" id="name" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Your full name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input required type="email" id="email" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                  <input required type="text" id="subject" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="What is this regarding?" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                  <textarea required id="message" rows="5" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none" placeholder="How can we help you?"></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={status === 'submitting'}
                  className={`w-full py-3 px-4 rounded-lg text-white font-semibold flex justify-center items-center transition-all ${
                    status === 'submitting' 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:scale-[1.01] active:scale-[0.98]'
                  }`}
                >
                  {status === 'submitting' ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* HOW CAN WE HELP */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
            How can we help?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
              <div className="text-2xl mb-3">🔑</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm">License Activation</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Questions or problems with activating a license.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
              <div className="text-2xl mb-3">📦</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm">License Management</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Need help managing your software licenses?
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
              <div className="text-2xl mb-3">🏢</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm">Bulk Licensing</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Questions about managing multiple licenses for an organization?
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
              <div className="text-2xl mb-3">👤</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-sm">Account Support</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Need help with your LockStrata account?
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default Contact
