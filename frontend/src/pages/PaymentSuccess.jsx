import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      api.post('/orders/confirm-payment', { sessionId })
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'))
    } else {
      setStatus('error')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Processing Payment...</h2>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Your order has been confirmed.</p>
            <button onClick={() => navigate('/dashboard')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Go to Dashboard
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Verification Failed</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">We couldn't verify your payment session.</p>
            <button onClick={() => navigate('/products')} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Return to Products
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
