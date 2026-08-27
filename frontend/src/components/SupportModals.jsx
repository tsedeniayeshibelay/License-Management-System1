import { useState, useEffect } from 'react'
import api from '../services/api'

// 1. DOCUMENTATION MODAL
export function DocumentationModal({ isOpen, onClose }) {
  const [activeDoc, setActiveDoc] = useState('getting-started')

  if (!isOpen) return null

  const docs = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Welcome to LockStrata</h4>
          <p>
            LockStrata provides state-of-the-art cryptographic software licensing, hardware-bound node-locking, and offline validation for desktop and server applications.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3 rounded-lg">
            <p className="font-semibold text-blue-900 dark:text-blue-300">Quick Checklist:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-blue-800 dark:text-blue-400 text-[11px]">
              <li>Locate your Product License Key in your Customer Dashboard.</li>
              <li>Activate the license directly from your software client using online or QR activation.</li>
              <li>Track and manage active machines under the "Devices" tab.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'activation',
      title: 'License Activation',
      content: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activating Your License</h4>
          <p>
            Each license key has an activation allowance based on your subscription tier (Single Device, Multi-Seat, or Floating).
          </p>
          <ol className="list-decimal pl-4 space-y-2 text-[11px]">
            <li><strong>Online Activation:</strong> Enter your License Key in the software dialog. The client contacts LockStrata API, registers your hardware fingerprint, and receives an active token.</li>
            <li><strong>QR Mobile Activation:</strong> If your machine is disconnected, scan the on-screen QR code with your mobile browser to authorize the machine remotely.</li>
            <li><strong>Offline License File:</strong> Import an encrypted signature file directly into the application.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'hardware-binding',
      title: 'Hardware Binding',
      content: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Machine Fingerprinting</h4>
          <p>
            LockStrata uses a multi-component SHA-256 fingerprint generated from motherboard serial, CPU ID, and MAC address.
          </p>
          <p className="text-[11px]">
            If you upgrade major hardware components (e.g. motherboard replacement), your machine may register as a new device. In this event, use the "Unbind Request" feature to release the old seat.
          </p>
        </div>
      )
    },
    {
      id: 'unbinding',
      title: 'Unbind & Transfers',
      content: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reassigning Seats</h4>
          <p>
            To transfer an active seat from an old computer to a new one:
          </p>
          <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
            <li>Navigate to the <strong>Devices</strong> section in your Customer Dashboard.</li>
            <li>Locate the device you wish to disconnect and click <strong>Request Unbind</strong>.</li>
            <li>State the reason for unbinding (e.g., machine decommissioned, hardware upgrade).</li>
            <li>Once approved by administration, the activation slot is restored immediately.</li>
          </ul>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full h-[520px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#0f52ba] dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Documentation & Guides</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Doc Nav */}
          <div className="w-48 border-r border-slate-200 dark:border-slate-800 p-3 space-y-1 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto">
            {docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeDoc === doc.id ? 'bg-[#0f52ba] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}
              >
                {doc.title}
              </button>
            ))}
          </div>

          {/* Doc Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {docs.find(d => d.id === activeDoc)?.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0f52ba] hover:bg-blue-700 transition-colors">
            Done
          </button>
        </div>

      </div>
    </div>
  )
}

// 2. CONTACT SUPPORT MODAL
export function ContactSupportModal({ isOpen, onClose, onTicketCreated }) {
  const [category, setCategory] = useState('Licensing Issue')
  const [priority, setPriority] = useState('MEDIUM')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticketSuccess, setTicketSuccess] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and message.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const res = await api.post('/support/ticket', {
        category,
        priority,
        subject: subject.trim(),
        message: message.trim()
      })
      setTicketSuccess(res.data)
      if (onTicketCreated) onTicketCreated(res.data)
    } catch (err) {
      console.error('Failed to submit ticket', err)
      setError(err.response?.data?.message || 'Failed to submit support ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTicketSuccess(null)
    setSubject('')
    setMessage('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Contact Support</h3>
              <p className="text-[11px] text-slate-500">Submit an official support ticket to our team</p>
            </div>
          </div>
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {ticketSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Submitted Successfully!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your ticket Reference ID is <span className="font-mono font-bold text-[#0f52ba]">#{ticketSuccess.id}</span>. Our technical support engineering team will review your inquiry shortly.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#0f52ba] hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option>Licensing Issue</option>
                  <option>Machine Activation</option>
                  <option>Hardware Unbinding</option>
                  <option>Billing & Subscription</option>
                  <option>Technical Bug</option>
                  <option>General Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                required
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#0f52ba]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Details</label>
              <textarea
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the issue, any error codes or affected machine details..."
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#0f52ba]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0f52ba] hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-1.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Ticket</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

// 3. SYSTEM STATUS MODAL
export function SystemStatusModal({ isOpen, onClose }) {
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/system/status')
      setStatusData(res.data)
    } catch (err) {
      console.error('Failed to fetch system status', err)
      setError('Unable to reach status engine. Please check connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const isAllOperational = statusData?.status === 'OPERATIONAL'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">LockStrata System Status</h3>
              <p className="text-[11px] text-slate-500">Live operational health & service telemetry</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-4 rounded-xl mb-4 border flex items-center justify-between ${isAllOperational ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'}`}>
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAllOperational ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isAllOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <div>
              <p className={`text-xs font-bold ${isAllOperational ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
                {isAllOperational ? 'All Core Systems Operational' : 'Partial Service Degradation Detected'}
              </p>
              <p className="text-[10px] text-slate-500">
                {statusData?.timestamp ? `Verified at ${new Date(statusData.timestamp).toLocaleTimeString()}` : 'Checking live services...'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Refresh Status"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Services List */}
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {statusData?.services?.map((svc, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{svc.name}</p>
                <p className="text-[10px] text-slate-500">{svc.description}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${svc.status === 'OPERATIONAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                {svc.status}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0f52ba] hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

// 4. FAQ MODAL
export function FAQModal({ isOpen, onClose }) {
  const [openIndex, setOpenIndex] = useState(0)

  if (!isOpen) return null

  const faqs = [
    {
      q: 'How do I activate a license on a new computer?',
      a: 'Launch your application, enter your License Key, and click Activate. The client will securely connect to LockStrata and bind your device. If the computer is offline, scan the on-screen QR code or import an offline license signature.'
    },
    {
      q: 'What is an unbind request and how long does it take?',
      a: 'If you need to replace a computer or transfer a seat, submit an Unbind Request under the Devices tab in your customer dashboard. Administrators typically review and approve requests within 24 hours.'
    },
    {
      q: 'Can I export my personal data at any time?',
      a: 'Yes. Under Privacy & Data, click "Download My Data" to generate a standardized JSON export containing your profile, registered devices, masked license keys, and activation history. Sensitive credentials such as passwords and secrets are never exported.'
    },
    {
      q: 'What happens when an account is deleted?',
      a: 'LockStrata utilizes an explicit soft-deletion model. All active license activations are deactivated immediately and future logins are blocked. In accordance with software compliance standards, historical audit and licensing records are preserved.'
    },
    {
      q: 'Where do I find my offline activation QR code?',
      a: 'When opening an unlicensed client without an internet connection, click "Activate via QR Code". A cryptographic QR code will be generated on your display, which you can scan using any smartphone browser to complete authorization.'
    }
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[540px]">
        
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h3>
              <p className="text-[11px] text-slate-500">Quick answers to common licensing and account questions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white">{faq.q}</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              {openIndex === index && (
                <div className="p-3.5 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0f52ba] hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
