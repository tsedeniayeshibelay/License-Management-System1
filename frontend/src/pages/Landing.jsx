import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Landing() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const mockLicenses = [
    { product: 'Photoshop', type: 'Per User', device: 'Desktop', expires: 'Dec 31, 2026' },
    { product: 'AutoCAD', type: 'Enterprise', device: 'Windows Server', expires: 'Lifetime' },
    { product: 'Figma', type: 'Subscription', device: 'MacBook Pro', expires: 'Jan 15, 2025' },
    { product: 'Visual Studio', type: 'Node-Locked', device: 'Linux Workstation', expires: 'Oct 01, 2024' },
    { product: 'Salesforce', type: 'Enterprise', device: 'Cloud Node', expires: 'Mar 12, 2027' },
    { product: 'Ableton Live', type: 'Per User', device: 'MacBook Pro', expires: 'Lifetime' },
    { product: 'Office 365', type: 'Subscription', device: 'Desktop', expires: 'Aug 20, 2025' },
    { product: 'Slack Pro', type: 'Enterprise', device: 'iPhone 15', expires: 'Nov 11, 2028' }
  ]

  const [verificationStep, setVerificationStep] = useState(1)
  const [displayData, setDisplayData] = useState(mockLicenses[0])

  useEffect(() => {
    let timeoutId;
    let licenseIndex = 1; // Start from 1 since index 0 is the initial state

    const runCycle = () => {
      // Step 1: Start verifying new license
      setVerificationStep(1);
      setDisplayData(mockLicenses[licenseIndex]);
      licenseIndex = (licenseIndex + 1) % mockLicenses.length;

      timeoutId = setTimeout(() => {
        // Step 2
        setVerificationStep(2);

        timeoutId = setTimeout(() => {
          // Step 3 (Active)
          setVerificationStep(3);

          timeoutId = setTimeout(() => {
            // Loop back
            runCycle();
          }, 3500); // Hold the active state for 3.5 seconds
        }, 1500); // 1.5 seconds on checking
      }, 1500); // 1.5 seconds on verifying
    };

    // Start cycle after the first initial wait
    timeoutId = setTimeout(() => {
      setVerificationStep(2);
      timeoutId = setTimeout(() => {
        setVerificationStep(3);
        timeoutId = setTimeout(() => {
          runCycle();
        }, 3500);
      }, 1500);
    }, 1500);

    return () => clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products/public')
        setProducts(res.data)
      } catch (err) {
        console.error("Failed to fetch products for landing page", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const featuredProduct = products.length > 0 ? products[0] : null
  const previewProducts = products.slice(0, 4)

  const formatLicenseType = (type) => {
    if (!type) return "Unknown"
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Common styles
  const sectionClass = "w-full py-24 md:py-32 px-6 relative"
  const containerClass = "max-w-7xl mx-auto"

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">

      <div className="bg-[#0B0F19] text-white relative">
        {/* 1. HERO SECTION */}
        <section className={`${sectionClass} pt-16 md:pt-24 pb-12 overflow-hidden relative`}>
          {/* Dot Pattern Background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          {/* Glows */}
          <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none"></div>

          <div className={`${containerClass} relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center`}>
            <div className="lg:col-span-5 flex flex-col items-start text-left animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="inline-flex items-center space-x-2 bg-[#1A2235] border border-slate-700/50 rounded-full px-4 py-1.5 mb-8 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-300 tracking-wider uppercase">THE LICENSE MARKETPLACE</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black text-white tracking-tight leading-[1.15] mb-6">
                Secure Software Licensing,<br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Made Simple</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 max-w-xl">
                Discover, purchase, activate, and manage software licenses from one secure platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <Link to="/products" className="w-full sm:w-auto px-8 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  Explore Products
                </Link>
                <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-slate-600 hover:border-slate-400 hover:bg-slate-800 text-white rounded-lg font-bold transition-all flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  Get Started
                </Link>
              </div>

              <div className="flex items-center space-x-6 mt-10">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  <span className="text-sm font-bold text-slate-300">Secure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-sm font-bold text-slate-300">Reliable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span className="text-sm font-bold text-slate-300">Instant Activation</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 relative w-full flex items-center justify-center lg:pl-10 animate-in fade-in slide-in-from-right-12 duration-1000 delay-150">
              <div className="relative w-full max-w-[480px] mx-auto lg:mx-0 flex flex-col items-center lg:scale-[0.85] xl:scale-100 origin-center">

                {/* Layer 1.5: Background Sparkles */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="absolute -top-10 -right-4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
                  <svg className="absolute -top-4 -right-16 w-3 h-3 text-blue-400 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>
                  <div className="absolute top-12 -left-10 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                  <svg className="absolute top-[45%] -right-24 w-4 h-4 text-cyan-300 animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>
                  <div className="absolute top-[60%] -right-8 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
                  <svg className="absolute bottom-16 -left-12 w-2.5 h-2.5 text-blue-400 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.2s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>
                  <div className="absolute -bottom-6 right-16 w-1 h-1 bg-cyan-200 rounded-full animate-pulse" style={{ animationDuration: '4s', animationDelay: '2.5s' }} />
                </div>

                {/* Layer 2: Desktop SVG Curved Arrows */}
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none hidden md:block z-10" aria-hidden="true">
                  <style>
                    {`
                      @keyframes dash {
                        to { stroke-dashoffset: -100; }
                      }
                      .path-animated {
                        animation: dash 10s linear infinite;
                      }
                    `}
                  </style>
                  <defs>
                    <marker id="arrow-secure" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                      <polygon points="0 0, 5 2.5, 0 5" fill="#3b82f6" />
                    </marker>
                    <marker id="arrow-verified" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                      <polygon points="0 0, 5 2.5, 0 5" fill="#3b82f6" />
                    </marker>
                    <marker id="arrow-protected" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                      <polygon points="0 0, 5 2.5, 0 5" fill="#10b981" />
                    </marker>
                  </defs>

                  {/* Secure -> Card (Elegant S-curve from top-left) */}
                  <path
                    d="M -30,-15 C 10,-15 0,140 20,140"

                    fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round"
                    markerEnd="url(#arrow-secure)" className="opacity-60 path-animated"
                  />

                  {/* Verified -> Card (Elegant curve from bottom-left) */}
                  <path
                    d="M -60,380 C -10,380 0,240 20,240"
                    fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round"
                    markerEnd="url(#arrow-verified)" className="opacity-60 path-animated"
                  />

                  {/* Card -> Protected (Elegant curve pointing left into the right side of the badge) */}
                  <path
                    d="M 420,390 C 420,466 360,466 310,466"
                    fill="none" stroke="#10b981" strokeWidth="1.25" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round"
                    markerEnd="url(#arrow-protected)" className="opacity-60 path-animated"
                  />
                </svg>

                {/* Layer 2.5: Premium Subtle Glow Behind Card */}
                <div className="absolute -inset-2 z-10 rounded-[24px] bg-gradient-to-tr from-blue-500/20 via-transparent to-cyan-400/20 blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute inset-0 z-10 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_-5px_rgba(34,211,238,0.2)] animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />

                {/* Layer 3: Main Verification Card */}
                <div className="relative w-full bg-[#111827] rounded-2xl border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 flex flex-col z-20">

                  <div className="flex items-center space-x-3 mb-6">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <h3 className="font-bold text-white tracking-wide text-sm">LIVE LICENSE VERIFICATION</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Left Timeline */}
                    <div className="flex-1 flex flex-col space-y-6 relative border-b sm:border-b-0 sm:border-r border-slate-800 pb-6 sm:pb-0 sm:pr-6">
                      <div className="absolute left-2.5 top-3 bottom-8 w-px bg-slate-800 -z-10"></div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 ${verificationStep === 1 ? 'bg-emerald-500 text-[#111827] shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div>
                          <div className={`text-sm font-bold transition-colors duration-500 ${verificationStep === 1 ? 'text-emerald-400' : 'text-slate-300'}`}>Verifying License...</div>
                          <div className={`text-xs transition-colors duration-500 ${verificationStep === 1 ? 'text-emerald-500/70' : 'text-slate-500'}`}>Connecting to secure server</div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 ${verificationStep === 2 ? 'bg-emerald-500 text-[#111827] shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div>
                          <div className={`text-sm font-bold transition-colors duration-500 ${verificationStep === 2 ? 'text-emerald-400' : 'text-slate-300'}`}>Checking License...</div>
                          <div className={`text-xs transition-colors duration-500 ${verificationStep === 2 ? 'text-emerald-500/70' : 'text-slate-500'}`}>Validating license details</div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 ${verificationStep === 3 ? 'bg-emerald-500 text-[#111827] shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div>
                          <div className={`text-sm font-bold transition-colors duration-500 ${verificationStep === 3 ? 'text-emerald-400' : 'text-slate-300'}`}>License Verified</div>
                          <div className={`text-xs transition-colors duration-500 ${verificationStep === 3 ? 'text-emerald-500/70' : 'text-slate-500'}`}>License is valid and active</div>
                        </div>
                      </div>
                    </div>

                    {/* Right Details */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="bg-[#1A2235] border border-slate-700/50 rounded-xl p-4 flex flex-col space-y-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-700/50">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-white tracking-wider">LICENSE VERIFIED</div>
                            <div className="text-[10px] text-slate-400">Your software is protected</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-y-3 gap-x-4 text-xs">
                          <span className="text-slate-400 flex items-center">Product</span>
                          <span className="font-bold text-white text-right transition-all duration-500">{displayData.product}</span>

                          <span className="text-slate-400 flex items-center">License Type</span>
                          <span className="font-bold text-white text-right transition-all duration-500">{displayData.type}</span>

                          <span className="text-slate-400 flex items-center">Status</span>
                          <span className={`font-bold flex items-center justify-end transition-colors duration-500 ${verificationStep === 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 transition-all duration-500 ${verificationStep === 3 ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-amber-500 shadow-[0_0_5px_#f59e0b]'}`}></span>
                            {verificationStep === 3 ? 'Active' : 'Pending'}
                          </span>

                          <span className="text-slate-400 flex items-center">Device</span>
                          <span className="font-bold text-white text-right transition-all duration-500">{displayData.device}</span>

                          <span className="text-slate-400 flex items-center">Expires On</span>
                          <span className="font-bold text-white text-right transition-all duration-500">{displayData.expires}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center items-center py-2.5 bg-[#0F172A] rounded-lg border border-emerald-900/40">
                    <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <span className="text-[11px] tracking-wide font-medium text-emerald-500">End-to-end encrypted connection</span>
                  </div>
                </div>

                {/* Layer 4: Badges */}
                {/* 1. SECURE BADGE */}
                <div className="md:absolute md:-left-[160px] md:-top-16 bg-[#1A2235] border border-slate-700/50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-3 z-30 opacity-95 mb-6 md:mb-0 w-full md:w-auto justify-center md:justify-start">
                  <div className="w-8 h-8 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/20 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight mb-0.5">Secure</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Your licenses are<br />protected</div>
                  </div>
                </div>

                {/* Mobile Arrow (Secure -> Card) */}
                <svg className="md:hidden w-8 h-10 mb-2 overflow-visible pointer-events-none">
                  <defs>
                    <marker id="arrow-mobile-1" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                      <polygon points="0 0, 4 2, 0 4" fill="#3b82f6" />
                    </marker>
                  </defs>
                  <path d="M 16,0 C 24,15 8,20 16,35" fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeDasharray="4 4" markerEnd="url(#arrow-mobile-1)" className="opacity-60 path-animated" />
                </svg>

                {/* Mobile Arrows (Card <-> Below) */}
                <div className="md:hidden flex w-full justify-between px-16 mt-2 mb-2">
                  <svg className="w-8 h-10 overflow-visible pointer-events-none">
                    <defs>
                      <marker id="arrow-up" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                        <polygon points="0 4, 4 4, 2 0" fill="#3b82f6" />
                      </marker>
                    </defs>
                    <path d="M 16,35 C 8,20 24,15 16,10" fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeDasharray="4 4" markerEnd="url(#arrow-up)" className="opacity-60 path-animated" />
                  </svg>

                  <svg className="w-8 h-10 overflow-visible pointer-events-none">
                    <defs>
                      <marker id="arrow-down" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                        <polygon points="0 0, 4 0, 2 4" fill="#10b981" />
                      </marker>
                    </defs>
                    <path d="M 16,0 C 24,15 8,20 16,25" fill="none" stroke="#10b981" strokeWidth="1.25" strokeDasharray="4 4" markerEnd="url(#arrow-down)" className="opacity-60 path-animated" />
                  </svg>
                </div>

                {/* Bottom Badges Container for Mobile */}
                <div className="flex justify-between w-full md:block mt-2 md:mt-0">

                  {/* 2. VERIFIED BADGE */}
                  <div className="md:absolute md:-left-[160px] md:-bottom-16 bg-[#1A2235] border border-slate-700/50 px-3 md:px-4 py-2 md:py-3 rounded-xl shadow-lg flex items-center space-x-2 md:space-x-3 z-30 opacity-95 flex-1 md:flex-none justify-center md:justify-start mr-2 md:mr-0">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center border border-blue-500/20 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                      <div className="text-[11px] md:text-xs font-bold text-white leading-tight mb-0.5">Verified</div>
                      <div className="text-[9px] md:text-[10px] text-slate-400 leading-tight">License is<br className="hidden md:block" />genuine</div>
                    </div>
                  </div>

                  {/* 3. PROTECTED BADGE */}
                  <div className="md:absolute md:left-1/2 md:-translate-x-1/2 md:-bottom-24 bg-[#1A2235] border border-slate-700/50 px-3 md:px-4 py-2 md:py-3 rounded-xl shadow-lg flex items-center space-x-2 md:space-x-3 z-30 opacity-95 flex-1 md:flex-none justify-center md:justify-start ml-2 md:ml-0">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-500/20 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    </div>
                    <div>
                      <div className="text-[11px] md:text-xs font-bold text-white leading-tight mb-0.5">Protected</div>
                      <div className="text-[9px] md:text-[10px] text-slate-400 leading-tight">Secure access<br className="hidden md:block" />granted</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. WHY LOCKSTRATA? (MATCHING IMAGE) */}
        <section className="w-full pb-16 px-6 relative z-10">
          <div className={`${containerClass} bg-[#0F1525] border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl`}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">Why LockStrata?</h2>
              <p className="text-slate-400 text-sm">One platform for your entire software licensing lifecycle.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex items-start space-x-4 hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Secure Licensing</h3>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Protect and verify software licenses from one centralized platform.</p>
                  <div className="text-blue-500 text-xs flex items-center hover:underline cursor-pointer">Learn more <span className="ml-1">&rarr;</span></div>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex items-start space-x-4 hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Instant Activation</h3>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Activate and manage licenses quickly without complicated processes.</p>
                  <div className="text-blue-500 text-xs flex items-center hover:underline cursor-pointer">Learn more <span className="ml-1">&rarr;</span></div>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex items-start space-x-4 hover:border-purple-500/30 transition-colors">
                <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center shrink-0 border border-purple-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Complete Control</h3>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Track license status, expiration, and usage from one place.</p>
                  <div className="text-blue-500 text-xs flex items-center hover:underline cursor-pointer">Learn more <span className="ml-1">&rarr;</span></div>
                </div>
              </div>

              <div className="flex flex-col justify-center items-center px-2">
                <div className="flex items-center space-x-3 w-full justify-between mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center text-slate-400 mb-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Discover</span>
                  </div>
                  <div className="text-slate-600 text-xs">&rarr;</div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-emerald-500/50 text-emerald-400 flex items-center justify-center mb-2 bg-emerald-500/10"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Choose</span>
                  </div>
                  <div className="text-slate-600 text-xs">&rarr;</div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-amber-500/50 text-amber-500 flex items-center justify-center mb-2 bg-amber-500/10"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Activate</span>
                  </div>
                  <div className="text-slate-600 text-xs">&rarr;</div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-blue-500/50 text-blue-400 flex items-center justify-center mb-2 bg-blue-500/10"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Manage</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">One platform. Every license.<br />Complete control.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. FIND THE RIGHT LICENSE (MATCHING IMAGE) */}
        <section className="w-full pb-24 px-6 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Find the License That Fits Your Needs</h2>
            <p className="text-slate-400 text-sm">Choose the licensing model that works best for you.</p>
          </div>

          <div className={`${containerClass} flex flex-col md:flex-row flex-wrap lg:flex-nowrap gap-4 justify-center`}>

            <div className="flex-1 min-w-[200px] bg-[#111827] rounded-2xl p-8 py-10 border-t-4 border-t-teal-500 border border-slate-800 hover:-translate-y-1 transition-transform relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-teal-500/10 text-teal-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <h3 className="font-bold text-white text-sm">Per User</h3>
              </div>
              <p className="text-xs text-slate-400 mb-8 h-10 leading-relaxed">Perfect when a license belongs to a specific user.</p>
              <div className="text-teal-400 text-xs flex items-center cursor-pointer hover:underline font-medium">Learn more <span className="ml-1">&rarr;</span></div>
            </div>

            <div className="flex-1 min-w-[200px] bg-[#111827] rounded-2xl p-8 py-10 border-t-4 border-t-purple-500 border border-slate-800 hover:-translate-y-1 transition-transform relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="font-bold text-white text-sm">Per Device</h3>
              </div>
              <p className="text-xs text-slate-400 mb-8 h-10 leading-relaxed">Ideal when software is licensed to a particular device.</p>
              <div className="text-blue-500 text-xs flex items-center cursor-pointer hover:underline font-medium">Learn more <span className="ml-1">&rarr;</span></div>
            </div>

            <div className="flex-1 min-w-[200px] bg-[#111827] rounded-2xl p-8 py-10 border-t-4 border-t-blue-500 border border-slate-800 hover:-translate-y-1 transition-transform relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="font-bold text-white text-sm">Subscription</h3>
              </div>
              <p className="text-xs text-slate-400 mb-8 h-10 leading-relaxed">Flexible access for a defined subscription period.</p>
              <div className="text-blue-500 text-xs flex items-center cursor-pointer hover:underline font-medium">Learn more <span className="ml-1">&rarr;</span></div>
            </div>

            <div className="flex-1 min-w-[200px] bg-[#111827] rounded-2xl p-8 py-10 border-t-4 border-t-amber-500 border border-slate-800 hover:-translate-y-1 transition-transform relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <h3 className="font-bold text-white text-sm">Volume</h3>
              </div>
              <p className="text-xs text-slate-400 mb-8 h-10 leading-relaxed">Designed for organizations managing multiple licenses.</p>
              <div className="text-blue-500 text-xs flex items-center cursor-pointer hover:underline font-medium">Learn more <span className="ml-1">&rarr;</span></div>
            </div>

            <div className="flex-1 min-w-[200px] bg-[#111827] rounded-2xl p-8 py-10 border-t-4 border-t-emerald-500 border border-slate-800 hover:-translate-y-1 transition-transform relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                </div>
                <h3 className="font-bold text-white text-sm">Open Source</h3>
              </div>
              <p className="text-xs text-slate-400 mb-8 h-10 leading-relaxed">Explore software distributed under an open-source model.</p>
              <div className="text-blue-500 text-xs flex items-center cursor-pointer hover:underline font-medium">Learn more <span className="ml-1">&rarr;</span></div>
            </div>

          </div>
        </section>
      </div>

      {/* 4. HOW IT WORKS */}
      <section className={`${sectionClass} bg-[#0B0F19] text-white border-y border-slate-800/50`}>
        <div className={containerClass}>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">How LockStrata Works</h2>
          </div>

          <div className="w-full bg-[#111827] border border-slate-700/50 rounded-3xl p-8 md:py-16 md:px-10 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 shadow-xl">
            {[
              {
                num: "01", numColor: "text-cyan-400", bgIcon: "bg-cyan-500/10", borderIcon: "border-cyan-500/20", iconColor: "text-cyan-400",
                title: "Discover a Product", desc: "Explore available software products.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              },
              {
                num: "02", numColor: "text-purple-400", bgIcon: "bg-purple-500/10", borderIcon: "border-purple-500/20", iconColor: "text-purple-400",
                title: "Choose a License", desc: "Select the license model that fits your needs.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              },
              {
                num: "03", numColor: "text-blue-400", bgIcon: "bg-blue-500/10", borderIcon: "border-blue-500/20", iconColor: "text-blue-400",
                title: "Activate", desc: "Activate your software license securely.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              },
              {
                num: "04", numColor: "text-emerald-400", bgIcon: "bg-emerald-500/10", borderIcon: "border-emerald-500/20", iconColor: "text-emerald-400",
                title: "Manage", desc: "Track and manage your licenses from one place.",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              }
            ].map((step, i) => (
              <React.Fragment key={step.num}>
                <div className="flex items-start md:items-center space-x-3 max-w-[240px]">
                  <div className={`text-2xl font-black ${step.numColor}`}>{step.num}</div>
                  <div className={`w-10 h-10 rounded-xl ${step.bgIcon} border ${step.borderIcon} flex items-center justify-center shrink-0`}>
                    <svg className={`w-5 h-5 ${step.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {step.icon}
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{step.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex text-slate-600 shrink-0 mx-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FOR EVERYONE */}
      <section className={`${sectionClass} bg-slate-50 dark:bg-slate-950`}>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Built for Every Licensing Need</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Whether you're an individual, an organization, or a software company.</p>
        </div>
        <div className={`${containerClass} grid grid-cols-1 lg:grid-cols-3 gap-8`}>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Private Customer</h3>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 flex-1">Purchase software for your personal use.</p>
            <ul className="space-y-3 mb-8">
              {["Browse software", "Purchase licenses", "Activate licenses", "Track your licenses"].map((f, i) => (
                <li key={i} className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>{f}
                </li>
              ))}
            </ul>
            <Link to="/products" className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold text-center transition-colors">
              Explore as Customer
            </Link>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col transform lg:-translate-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2 relative z-10">Bulk Buyer Company</h3>
            <p className="text-slate-300 font-medium mb-6 flex-1 relative z-10">Purchase and manage licenses for your organization.</p>
            <ul className="space-y-3 mb-8 relative z-10">
              {["Volume licensing", "Centralized license management", "Employee assignment", "License usage tracking"].map((f, i) => (
                <li key={i} className="flex items-center text-sm text-white">
                  <svg className="w-4 h-4 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>{f}
                </li>
              ))}
            </ul>
            <Link to="/products" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-center shadow-lg shadow-blue-500/20 transition-colors relative z-10">
              Explore Business Licensing
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Product Owner Company</h3>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 flex-1">Create products and manage licenses issued to your customers.</p>
            <ul className="space-y-3 mb-8">
              {["Publish products", "Offer license types", "Manage issued licenses", "Monitor customers"].map((f, i) => (
                <li key={i} className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold text-center transition-colors">
              For Product Owners
            </Link>
          </div>

        </div>
      </section>

      {/* 6 & 7. FEATURED & PRODUCT CATALOG PREVIEW */}
      <section className={`${sectionClass} bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800`}>
        <div className={containerClass}>

          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">Explore Software Products</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl">Find the right software and license for your needs.</p>
            </div>
            <Link to="/products" className="hidden md:inline-flex mt-6 md:mt-0 items-center font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              View All Products
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-12">

              {/* Featured Product */}
              {featuredProduct && (
                <div className="relative group bg-slate-50 dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-3xl p-8 md:p-12 shadow-lg overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="absolute top-0 right-0 p-6 text-blue-100 dark:text-blue-900/30 opacity-50 pointer-events-none">
                    <svg className="w-64 h-64 -mt-16 -mr-16 transform group-hover:scale-110 transition-transform duration-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                  </div>
                  <div className="relative z-10 flex-1">
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider rounded-full mb-4">Featured Software</span>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl font-black text-slate-300 dark:text-slate-600 shadow-sm border border-slate-200 dark:border-slate-700">
                        {featuredProduct.name ? featuredProduct.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{featuredProduct.name}</h3>
                        <p className="text-slate-500 font-medium">By {featuredProduct.company?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl">
                      {featuredProduct.description || 'A powerful solution designed for modern professionals.'}
                    </p>
                    <div className="flex flex-wrap gap-3 mb-8">
                      <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg">{formatLicenseType(featuredProduct.licenseType)}</span>
                      <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg">${featuredProduct.price || 0}</span>
                    </div>
                    <Link to="/products" className="inline-flex px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl font-bold shadow-md transition-colors">
                      View Product
                    </Link>
                  </div>
                </div>
              )}

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewProducts.map((p, idx) => {
                  if (idx === 0) return null // skip featured
                  return (
                    <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                          {p.name ? p.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h4>
                          <p className="text-xs text-slate-500">By {p.company?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1 line-clamp-2">{p.description}</p>
                      <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{formatLicenseType(p.licenseType)}</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">${p.price || 0}</span>
                        </div>
                        <Link to="/products" className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">View Details &rarr;</Link>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link to="/products" className="inline-flex items-center font-bold text-blue-600 hover:text-blue-700 transition-colors">
              View All Products
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>
          </div>

        </div>
      </section>

      {/* 8. SECURITY SECTION */}
      <section className={`${sectionClass} bg-slate-900 text-white overflow-hidden`}>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className={`${containerClass} grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10`}>
          <div>
            <h2 className="text-3xl md:text-4xl font-black mb-6">Licenses You Can Trust</h2>
            <p className="text-slate-300 text-lg mb-10 max-w-xl">Keep your software licenses organized, controlled, and easy to manage.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { title: "Secure License Management", desc: "Keep licenses organized and protected.", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
                { title: "License Activation", desc: "Activate licenses through a controlled process.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                { title: "License Status Tracking", desc: "Know whether licenses are active, available, expired, or revoked.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                { title: "Centralized Management", desc: "Manage software licenses from one place.", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" }
              ].map((f, i) => (
                <div key={i} className="flex items-start">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mr-4 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon}></path></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-sm text-slate-400">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-full max-w-sm aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-2xl p-8 relative flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMzMzQxNTUiLz48L3N2Zz4=')] opacity-20 rounded-3xl"></div>

              <svg className="w-32 h-32 text-emerald-400 mb-8 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>

              <div className="flex items-center space-x-2 bg-slate-950/80 px-6 py-3 rounded-full border border-slate-700 backdrop-blur-md relative z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm font-bold tracking-wide">System Protected</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* 11. FINAL CTA */}
      <section className={`${sectionClass} bg-slate-50 dark:bg-slate-950 overflow-hidden relative`}>
        <div className="absolute inset-0 bg-blue-600/5 dark:bg-blue-600/10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-square bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-blue-400/20 to-transparent dark:from-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className={`${containerClass} relative z-10 text-center max-w-3xl mx-auto`}>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Ready to manage your software licenses?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
            Discover software, choose the right license, and manage everything from one secure platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/products" className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              Explore Products
            </Link>
            <Link to="/register" className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </section>


    </div>
  )
}

export default Landing
