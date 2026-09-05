import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import api from '../services/api'
import { AuthContext } from '../context/AuthContext'

export default function QRActivatePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [qrInfo, setQrInfo] = useState(null)
  const [licenses, setLicenses] = useState([])
  const [selectedLicenseId, setSelectedLicenseId] = useState('')
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { returnUrl: `/customer/activate/qr/${token}` } })
      return
    }
    
    const fetchInfoAndLicenses = async () => {
      try {
        setLoading(true)
        // 1. Fetch QR Info
        const infoRes = await api.get(`/activations/qr/info/${token}`)
        setQrInfo(infoRes.data)
        
        // 2. Fetch User's Licenses
        const licRes = await api.get('/licenses')
        const allLicenses = Array.isArray(licRes.data) ? licRes.data : (Array.isArray(licRes.data?.content) ? licRes.data.content : [])
        
        // Filter licenses that match the requested product name
        // (Alternatively we could filter by productId if the backend returned it, but let's just show active licenses)
        const eligible = allLicenses.filter(l => 
          (l.status === 'ACTIVE' || l.status === 'NOT_ACTIVATED') && 
          l.productName === infoRes.data.productName
        )
        setLicenses(eligible)
        
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired QR request.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchInfoAndLicenses()
  }, [token, user, navigate])

  const handleApprove = async () => {
    if (!selectedLicenseId) {
      alert("Please select a license to activate.")
      return
    }
    
    setApproving(true)
    setError(null)
    try {
      await api.post('/activations/qr/approve', {
        publicApprovalToken: token,
        licenseId: parseInt(selectedLicenseId)
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve activation.')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#131a2b] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Approve Device Activation
        </h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Validating QR Request...</p>
          </div>
        ) : success ? (
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Activation Approved!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">The requesting device has been authorized. You can now close this window and check the software.</p>
            <button 
              onClick={() => navigate('/customer/dashboard')}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl transition-transform hover:scale-[1.02] shadow-lg"
            >
              Return to Dashboard
            </button>
          </div>
        ) : qrInfo && !error ? (
          <div className="animate-in zoom-in-95 duration-300 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Product</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{qrInfo.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Device Name</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{qrInfo.deviceName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Hardware ID</p>
                  <p className="text-xs font-mono bg-slate-200 dark:bg-slate-900 p-2 rounded text-slate-700 dark:text-slate-300">{qrInfo.machineId}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Select a License to Assign:</label>
              {licenses.length > 0 ? (
                <select 
                  value={selectedLicenseId} 
                  onChange={e => setSelectedLicenseId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose a License --</option>
                  {licenses.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.licenseType} - {l.currentActivations || 0}/{l.maxActivations || '∞'} used - Expires {l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : 'Never'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  You don't have any eligible active licenses for {qrInfo.productName}.
                </div>
              )}
            </div>

            <button 
              onClick={handleApprove}
              disabled={approving || !selectedLicenseId}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-transform shadow-lg flex items-center justify-center"
            >
              {approving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Confirm Activation
            </button>
          </div>
        ) : (
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Request Error</h3>
            <p className="text-red-500 dark:text-red-400 mb-8 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">{error}</p>
            <button 
              onClick={() => navigate('/customer/dashboard')}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl transition-transform hover:scale-[1.02] shadow-lg"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
