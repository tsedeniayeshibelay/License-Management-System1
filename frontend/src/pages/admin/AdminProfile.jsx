import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data);
      setFormData({
        fullName: res.data.fullName || res.data.username || '',
        email: res.data.email || '',
        phone: res.data.phone || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile', err);
      // Fallback
      setFormData({
        fullName: 'Administrator',
        email: 'admin@lockstrata.com',
        phone: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call for saving profile
    setTimeout(() => {
      setSaving(false);
      alert('Profile updated successfully!');
    }, 800);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Your Profile</h2>
        <p className="text-sm text-slate-400 mt-1">Manage your personal account information and avatar.</p>
      </div>

      <div className="bg-[#111827] border border-slate-800/80 rounded-xl shadow-sm p-8">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-sm font-bold text-slate-400">Loading Profile...</span>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            
            {/* AVATAR MANAGEMENT */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Profile Picture</h3>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-indigo-500/20 border-4 border-[#0b0f19]">
                  {formData.fullName.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors"
                    >
                      Upload new photo
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                      Remove
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                  </div>
                  <p className="text-[11px] text-slate-500">Recommended size: 256x256px. Max file size: 2MB.</p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-800/80"></div>

            {/* ACCOUNT INFO */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Saving...</>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
