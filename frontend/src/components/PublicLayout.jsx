import { Outlet, Link, useLocation } from 'react-router-dom'

function PublicLayout() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white selection:bg-blue-500/30">
      
      {/* PUBLIC NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-400 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
              LockStrata
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm font-semibold transition-colors ${isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
              Home
            </Link>
            <Link to="/products" className={`text-sm font-semibold transition-colors ${isActive('/products') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
              Products
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Link to="/login" className="hidden sm:inline-flex text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all hover:scale-105 active:scale-95">
              Register
            </Link>
          </div>
          
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 pt-16 pb-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* COLUMN 1 — LOCKSTRATA BRAND */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-2xl font-extrabold tracking-tight text-white flex items-center">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              LockStrata
            </h3>
            <p className="text-slate-300 font-medium">Secure software licensing made simple.</p>
            <p className="text-slate-500 text-sm leading-relaxed">Discover, activate, and manage software licenses from one secure platform.</p>
            <div className="pt-2">
              <Link to="/products" className="inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Explore Products <span className="ml-1">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* COLUMN 2 — PLATFORM */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/products" className="text-slate-400 hover:text-white transition-colors">Product Catalog</Link></li>
              <li><Link to="/support" className="text-slate-400 hover:text-white transition-colors">License Management</Link></li>
              <li><Link to="/faq" className="text-slate-400 hover:text-white transition-colors">License Activation</Link></li>
              <li><Link to="/faq" className="text-slate-400 hover:text-white transition-colors">License Models</Link></li>
              <li><Link to="/security" className="text-slate-400 hover:text-white transition-colors">License Status</Link></li>
            </ul>
          </div>

          {/* COLUMN 3 — SOLUTIONS */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Solutions</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">Private Customer</Link></li>
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">Bulk Buyer</Link></li>
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">Product Owner</Link></li>
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">Organizations</Link></li>
            </ul>
          </div>

          {/* COLUMN 4 — COMPANY & SUPPORT */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-3 text-sm mb-8">
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">About LockStrata</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="text-slate-400 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/support" className="text-slate-400 hover:text-white transition-colors">Support</Link></li>
              <li><Link to="/security" className="text-slate-400 hover:text-white transition-colors">Security</Link></li>
            </ul>

            {/* CONTACT AREA */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-white font-medium text-sm mb-1">Need help?</div>
              <p className="text-slate-500 text-xs mb-3">Questions about licensing or activation?</p>
              <Link to="/contact" className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center transition-colors">
                Contact Support <span className="ml-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER BAR */}
        <div className="max-w-7xl mx-auto border-t border-slate-800 pt-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-500">
            <span>&copy; 2026 LockStrata Inc. All rights reserved.</span>
            
            <div className="hidden sm:block w-1 h-1 bg-slate-700 rounded-full"></div>
            
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
              <Link to="/security" className="hover:text-slate-300 transition-colors">Security</Link>
            </div>
          </div>

          {/* LICENSE STATUS FEATURE */}
          <Link to="/security" className="flex items-center space-x-3 bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-lg transition-colors group">
            <div className="text-emerald-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div className="text-left">
              <div className="text-xs text-white font-bold group-hover:text-emerald-400 transition-colors">License Status</div>
              <div className="text-[10px] text-slate-400">Verify a license</div>
            </div>
          </Link>
          
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
