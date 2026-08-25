import axios from 'axios'

// Create a custom axios instance
const api = axios.create({
  baseURL: 'http://localhost:8080/api'
})

// Add an interceptor to automatically attach the token to every request
api.interceptors.request.use(
  (config) => {
    // Look for the token in localStorage
    const token = localStorage.getItem('token')
    
    // If we have a token, attach it to the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for global errors including HTTP 503 Maintenance
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503 && error.response?.data?.maintenance) {
      window.dispatchEvent(new CustomEvent('lockstrata:maintenance', {
        detail: {
          platformName: error.response.data.platformName || 'LockStrata Enterprise',
          supportEmail: error.response.data.supportEmail || 'support@lockstrata.com',
          message: error.response.data.message || 'Scheduled maintenance active.'
        }
      }))
    }
    return Promise.reject(error)
  }
)

export default api
