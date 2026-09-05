import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import TwoFactorSetupModal from '../../components/TwoFactorSetupModal';
import { applyThemeMode, getSavedThemeMode } from '../../utils/theme';
import { applyAccentColor } from '../../utils/accentColor';

const ACCENT_SWATCHES = [
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'blue', name: 'Ocean Blue', hex: '#3b82f6' },
  { id: 'emerald', name: 'Emerald Green', hex: '#10b981' },
  { id: 'purple', name: 'Royal Purple', hex: '#a855f7' },
  { id: 'rose', name: 'Rose Pink', hex: '#f43f5e' }
];

export default function AdminSettings({ user }) {
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Theme & Appearance State
  const [themeMode, setThemeMode] = useState(() => getSavedThemeMode());
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'indigo');
  const [appearanceMsg, setAppearanceMsg] = useState('');

  // States for toggles
  const [toggles, setToggles] = useState(() => {
    const savedSidebar = localStorage.getItem('sidebarExpanded');
    const savedLocalPrefs = localStorage.getItem('saveLocalPreferences');
    return {
      twoFactor: false,
      loginAlerts: true,
      securityAlerts: true,
      failedActivations: true,
      unbindRequests: true,
      licenseExpiration: false,
      newUserAlerts: true,
      systemNotifications: true,
      sidebarExpanded: savedSidebar !== null ? savedSidebar === 'true' : true,
      localPreferences: savedLocalPrefs !== null ? savedLocalPrefs === 'true' : true,
    };
  });

  // Privacy & Data Management State
  const [exportingData, setExportingData] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState({ type: '', text: '' });

  // Global Platform Settings (backed by real database & Spring Boot settings)
  const [globalSettings, setGlobalSettings] = useState({
    platformName: 'LockStrata Enterprise',
    supportEmail: 'support@lockstrata.com',
    adminPortalUrl: 'https://admin.lockstrata.com',
    maintenanceMode: false,
    debugLogging: false,
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccessMsg, setGeneralSuccessMsg] = useState('');
  const [generalErrorMsg, setGeneralErrorMsg] = useState('');

  // Active Sessions & Password Management
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [sessionMsg, setSessionMsg] = useState({ type: '', text: '' });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
    fetchGlobalSettings();
    fetchDevices();
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await api.get('/users/profile/devices');
      if (res.data && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch active sessions', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      await api.delete(`/users/profile/devices/${deviceId}`);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      setSessionMsg({ type: 'success', text: 'Session revoked successfully.' });
      setTimeout(() => setSessionMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setSessionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to revoke session.' });
      setTimeout(() => setSessionMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const currentId = localStorage.getItem('app_device_id');
    const currentDevice = devices.find(d => d.deviceIdentifier === currentId) || devices[0];
    try {
      await api.post('/users/profile/devices/revoke-others', null, {
        params: {
          currentDeviceId: currentId || '',
          keepDeviceId: currentDevice ? currentDevice.id : undefined
        }
      });
      if (currentDevice) {
        setDevices([currentDevice]);
      } else {
        fetchDevices();
      }
      setSessionMsg({ type: 'success', text: 'Signed out of all other sessions successfully.' });
      setTimeout(() => setSessionMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setSessionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to sign out of other sessions.' });
      setTimeout(() => setSessionMsg({ type: '', text: '' }), 4000);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await api.put('/users/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });
      setPasswordMsg({ type: 'success', text: res.data?.message || 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMsg({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await api.get('/system/settings');
      if (res.data) {
        setGlobalSettings({
          platformName: res.data.platformName || 'LockStrata Enterprise',
          supportEmail: res.data.supportEmail || 'support@lockstrata.com',
          adminPortalUrl: res.data.adminPortalUrl || 'https://admin.lockstrata.com',
          maintenanceMode: Boolean(res.data.maintenanceMode),
          debugLogging: Boolean(res.data.debugLogging),
        });
      }
    } catch (err) {
      console.error('Failed to load global settings', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setProfile(res.data);
      if (res.data.preferences) {
        try {
          const prefs = JSON.parse(res.data.preferences);
          if (prefs.theme) {
            setThemeMode(prefs.theme);
            applyThemeMode(prefs.theme);
          }
          if (prefs.accentColor) {
            setAccentColor(prefs.accentColor);
            applyAccentColor(prefs.accentColor);
          }
          if (typeof prefs.sidebarExpanded === 'boolean') {
            setToggles(prev => ({ ...prev, sidebarExpanded: prefs.sidebarExpanded }));
            localStorage.setItem('sidebarExpanded', String(prefs.sidebarExpanded));
            window.dispatchEvent(new Event('sidebar-changed'));
          }
          if (typeof prefs.localPreferences === 'boolean') {
            setToggles(prev => ({ ...prev, localPreferences: prefs.localPreferences }));
            localStorage.setItem('saveLocalPreferences', String(prefs.localPreferences));
          }
          if (prefs.toggles) {
            setToggles(prev => ({ ...prev, ...prefs.toggles }));
            if (typeof prefs.toggles.localPreferences === 'boolean') {
              localStorage.setItem('saveLocalPreferences', String(prefs.toggles.localPreferences));
            }
          }
        } catch (e) {
          console.error('Failed to parse preferences', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
      // Fallback to prop if fetch fails
      if (user) setProfile(user);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (mode) => {
    setThemeMode(mode);
    applyThemeMode(mode);

    try {
      let currentPrefs = {};
      try { currentPrefs = JSON.parse(profile?.preferences || '{}'); } catch(e) {}
      const updatedPrefs = { ...currentPrefs, theme: mode };
      await api.put('/users/profile', {
        fullName: profile?.fullName || 'Admin',
        preferences: JSON.stringify(updatedPrefs)
      });
      setProfile(prev => ({ ...prev, preferences: JSON.stringify(updatedPrefs) }));
      setAppearanceMsg(`Theme mode set to ${mode}.`);
      setTimeout(() => setAppearanceMsg(''), 3000);
    } catch (err) {
      console.warn('Failed to persist theme preference to backend:', err.message);
    }
  };

  const handleAccentChange = async (color) => {
    setAccentColor(color);
    applyAccentColor(color);

    try {
      let currentPrefs = {};
      try { currentPrefs = JSON.parse(profile?.preferences || '{}'); } catch(e) {}
      const updatedPrefs = { ...currentPrefs, accentColor: color };
      await api.put('/users/profile', {
        fullName: profile?.fullName || 'Admin',
        preferences: JSON.stringify(updatedPrefs)
      });
      setProfile(prev => ({ ...prev, preferences: JSON.stringify(updatedPrefs) }));
      setAppearanceMsg(`Accent color updated.`);
      setTimeout(() => setAppearanceMsg(''), 3000);
    } catch (err) {
      console.warn('Failed to persist accent color preference to backend:', err.message);
    }
  };

  const [notifSuccessMsg, setNotifSuccessMsg] = useState('');

  const toggleSetting = async (key) => {
    if (key === 'maintenanceMode' || key === 'debugLogging') {
      const newVal = !globalSettings[key];
      const updated = { ...globalSettings, [key]: newVal };
      setGlobalSettings(updated);
      try {
        await api.put('/system/settings', updated);
        setGeneralSuccessMsg(`${key === 'maintenanceMode' ? 'Maintenance Mode' : 'Debug Logging'} ${newVal ? 'enabled' : 'disabled'} successfully.`);
        setTimeout(() => setGeneralSuccessMsg(''), 4000);
      } catch (e) {
        console.error('Failed to update system setting', e);
        setGeneralErrorMsg('Failed to update setting.');
        setTimeout(() => setGeneralErrorMsg(''), 4000);
      }
      return;
    }

    const newVal = !toggles[key];
    const newToggles = { ...toggles, [key]: newVal };
    setToggles(newToggles);

    if (key === 'sidebarExpanded') {
      localStorage.setItem('sidebarExpanded', String(newVal));
      window.dispatchEvent(new Event('sidebar-changed'));
    }

    if (key === 'localPreferences') {
      localStorage.setItem('saveLocalPreferences', String(newVal));
      if (newVal) {
        try {
          let currentPrefs = {};
          try { currentPrefs = JSON.parse(profile?.preferences || '{}'); } catch(e) {}
          localStorage.setItem('admin_local_preferences', JSON.stringify({
            ...currentPrefs,
            toggles: newToggles,
            theme: themeMode,
            accentColor: accentColor
          }));
        } catch(e) {}
      } else {
        localStorage.removeItem('admin_local_preferences');
      }
    }

    try {
      let currentPrefs = {};
      try { currentPrefs = JSON.parse(profile?.preferences || '{}'); } catch(e) {}
      const updatedPrefs = {
        ...currentPrefs,
        toggles: newToggles,
        notifications: { ...(currentPrefs.notifications || {}), ...newToggles },
        [key]: newVal,
        sidebarExpanded: key === 'sidebarExpanded' ? newVal : (typeof currentPrefs.sidebarExpanded === 'boolean' ? currentPrefs.sidebarExpanded : newToggles.sidebarExpanded),
        localPreferences: key === 'localPreferences' ? newVal : (typeof currentPrefs.localPreferences === 'boolean' ? currentPrefs.localPreferences : newToggles.localPreferences)
      };
      await api.put('/users/profile', {
        fullName: profile?.fullName || 'Admin',
        preferences: JSON.stringify(updatedPrefs)
      });
      setProfile(prev => ({ ...prev, preferences: JSON.stringify(updatedPrefs) }));
      if (key === 'sidebarExpanded') {
        setAppearanceMsg(`Sidebar default set to ${newVal ? 'Expanded' : 'Collapsed'}.`);
        setTimeout(() => setAppearanceMsg(''), 3000);
      } else if (key === 'localPreferences') {
        setPrivacyMsg({
          type: 'success',
          text: newVal 
            ? 'Local preferences enabled. UI preferences are saved in LocalStorage.' 
            : 'Local preferences disabled. Browser LocalStorage cleared.'
        });
        setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
      } else {
        setNotifSuccessMsg('Notification preference updated successfully.');
        setTimeout(() => setNotifSuccessMsg(''), 3000);
      }
    } catch (e) {
      console.warn('Failed to save toggle setting', e);
    }
  };

  const handleExportPersonalData = async () => {
    setExportingData(true);
    setPrivacyMsg({ type: '', text: '' });
    try {
      const res = await api.get('/users/export-data');
      const exportJson = JSON.stringify(res.data, null, 2);
      const blob = new Blob([exportJson], { type: 'application/json;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lockstrata-account-data-${profile?.username || 'admin'}-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPrivacyMsg({ type: 'success', text: 'Personal account data exported successfully.' });
      setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Data export error:', err);
      setPrivacyMsg({ type: 'error', text: 'Failed to export account data. Please try again.' });
      setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
    } finally {
      setExportingData(false);
    }
  };

  const handleDownloadLoginHistory = async () => {
    setDownloadingHistory(true);
    setPrivacyMsg({ type: '', text: '' });
    try {
      // 1. Try server-side CSV streaming endpoint first
      try {
        const res = await api.get('/users/login-history/csv', { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lockstrata-login-history-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setPrivacyMsg({ type: 'success', text: 'Login history CSV downloaded successfully.' });
        setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
        return;
      } catch (apiErr) {
        console.warn('Backend login-history CSV endpoint unavailable, falling back to active sessions export', apiErr);
      }

      // 2. Fallback: generate CSV from active sessions / device history
      let deviceList = devices;
      if (!deviceList || deviceList.length === 0) {
        try {
          const res = await api.get('/users/profile/devices');
          if (res.data && Array.isArray(res.data)) deviceList = res.data;
        } catch (e) {}
      }

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const headers = ["Timestamp", "Device / Browser", "IP Address", "Status", "Device Identifier", "First Seen"];
      const rows = [];
      if (deviceList && deviceList.length > 0) {
        deviceList.forEach(dev => {
          const lastLogin = dev.lastLoginAt ? new Date(dev.lastLoginAt) : new Date(dev.firstSeenAt || Date.now());
          if (lastLogin >= ninetyDaysAgo) {
            rows.push([
              `"${lastLogin.toISOString()}"`,
              `"${(dev.deviceName || 'Browser Session').replace(/"/g, '""')}"`,
              `"${dev.ipAddress || '127.0.0.1'}"`,
              `"Successful Login"`,
              `"${dev.deviceIdentifier || 'N/A'}"`,
              `"${dev.firstSeenAt || 'N/A'}"`
            ]);
          }
        });
      }
      if (rows.length === 0) {
        rows.push([
          `"${new Date().toISOString()}"`,
          `"Current Admin Browser Session"`,
          `"127.0.0.1"`,
          `"Successful Login"`,
          `"current-session"`,
          `"${new Date().toISOString()}"`
        ]);
      }
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lockstrata-login-history-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPrivacyMsg({ type: 'success', text: 'Login history CSV downloaded successfully.' });
      setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Login history download error:', err);
      setPrivacyMsg({ type: 'error', text: 'Failed to download login history.' });
      setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000);
    } finally {
      setDownloadingHistory(false);
    }
  };

  const handleSaveGlobalSettings = async (e) => {
    e?.preventDefault();
    setSavingGeneral(true);
    setGeneralSuccessMsg('');
    setGeneralErrorMsg('');
    try {
      const res = await api.put('/system/settings', globalSettings);
      if (res.data) {
        setGlobalSettings({
          platformName: res.data.platformName,
          supportEmail: res.data.supportEmail,
          adminPortalUrl: res.data.adminPortalUrl,
          maintenanceMode: Boolean(res.data.maintenanceMode),
          debugLogging: Boolean(res.data.debugLogging),
        });
      }
      setGeneralSuccessMsg('Global platform settings saved successfully.');
      setTimeout(() => setGeneralSuccessMsg(''), 4000);
    } catch (err) {
      setGeneralErrorMsg(err.response?.data?.message || 'Failed to save settings.');
      setTimeout(() => setGeneralErrorMsg(''), 4000);
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    try {
      setLoading(true);
      await api.post(`/auth/2fa/disable?email=${encodeURIComponent(profile.email)}`);
      setProfile(prev => ({ ...prev, twoFactorEnabled: false }));
      setSuccessMsg("Two-Factor Authentication has been successfully disabled.");
    } catch (err) {
      console.error("Failed to disable 2FA", err);
      setErrorMsg(err.response?.data?.message || "Failed to disable 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path> },
    { id: 'security', label: 'Security', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path> },
    { id: 'notifications', label: 'Notifications', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path> },
    { id: 'appearance', label: 'Appearance', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path> },
    { id: 'privacy', label: 'Privacy & Data', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path> },
  ];

  // Helper component for toggle switches
  const ToggleSwitch = ({ label, description, stateKey }) => {
    const isChecked = (stateKey === 'maintenanceMode' || stateKey === 'debugLogging')
      ? Boolean(globalSettings[stateKey])
      : Boolean(toggles[stateKey]);

    return (
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{label}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <button 
          onClick={() => toggleSetting(stateKey)}
          className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${isChecked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </button>
      </div>
    );
  };

  return (
    <div className="p-8 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your administrator account, preferences, and security.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
        
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-64 shrink-0 flex flex-col space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
                activeTab === tab.id 
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-[#111827] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 p-8">
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold">Loading settings...</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              
              {/* --- GENERAL TAB --- */}
              {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Global Platform Settings</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Manage system-wide configurations and branding.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Platform Name</label>
                        <input 
                          type="text" 
                          value={globalSettings.platformName} 
                          onChange={(e) => setGlobalSettings(prev => ({ ...prev, platformName: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Support Email Address</label>
                          <input 
                            type="email" 
                            value={globalSettings.supportEmail} 
                            onChange={(e) => setGlobalSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Portal URL</label>
                          <input 
                            type="text" 
                            value={globalSettings.adminPortalUrl} 
                            disabled 
                            className="w-full bg-slate-100 dark:bg-[#0b0f19]/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">System Status</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Control global platform availability.</p>
                    
                    <div className="space-y-3">
                      <ToggleSwitch 
                        label="Maintenance Mode" 
                        description="Temporarily disable customer API access and show maintenance page." 
                        stateKey="maintenanceMode" 
                      />
                      <ToggleSwitch 
                        label="Debug Logging" 
                        description="Enable verbose application logging for troubleshooting." 
                        stateKey="debugLogging" 
                      />
                    </div>
                  </div>

                  {generalSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">
                      {generalSuccessMsg}
                    </div>
                  )}
                  {generalErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg">
                      {generalErrorMsg}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handleSaveGlobalSettings}
                      disabled={savingGeneral}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors disabled:opacity-60"
                    >
                      {savingGeneral ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* --- SECURITY TAB --- */}
              {activeTab === 'security' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Security Settings</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Manage passwords and authentication methods.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Change Password</label>
                        <button 
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#0b0f19] dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Update Password
                        </button>
                      </div>
                      
                      <div className="pt-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">Two-Factor Authentication (2FA)</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Require an authentication code when signing in.</p>
                            {profile?.twoFactorEnabled && <p className="text-[11px] text-emerald-400 font-bold mt-1">✓ Enabled</p>}
                          </div>
                          <div className="flex items-center space-x-2">
                            {profile?.twoFactorEnabled ? (
                              <>
                                <button 
                                  onClick={handleDisable2FA}
                                  className="text-xs font-bold text-red-400 border border-red-500/50 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                                >
                                  Disable 2FA
                                </button>
                                <button 
                                  onClick={() => setIs2FAModalOpen(true)}
                                  className="text-xs font-bold text-indigo-400 border border-indigo-500/50 rounded-lg px-3 py-1.5 hover:bg-indigo-500/10 transition-colors"
                                >
                                  Reset 2FA
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => setIs2FAModalOpen(true)}
                                className="text-xs font-bold text-indigo-400 border border-indigo-500/50 rounded-lg px-3 py-1.5 hover:bg-indigo-500/10 transition-colors"
                              >
                                Enable 2FA
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <ToggleSwitch 
                          label="Login Alerts" 
                          description="Send me an email when a sign-in occurs from a new device." 
                          stateKey="loginAlerts" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Sessions</h3>
                      <button 
                        onClick={fetchDevices} 
                        disabled={loadingDevices}
                        className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                        title="Refresh sessions"
                      >
                        <svg className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Manage devices currently logged into your account.</p>

                    {sessionMsg.text && (
                      <div className={`mb-4 p-3 rounded-lg text-xs font-semibold ${sessionMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                        {sessionMsg.text}
                      </div>
                    )}
                    
                    <div className="space-y-3 mb-6">
                      {devices.length === 0 && !loadingDevices && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-indigo-400">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">Windows PC - Chrome</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">Current session • Active now</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Active</span>
                        </div>
                      )}

                      {devices.map((d, idx) => {
                        const currentId = localStorage.getItem('app_device_id');
                        const isCurrent = (currentId && d.deviceIdentifier === currentId) || (!currentId && idx === 0);
                        const isMobile = (d.deviceName || '').toLowerCase().includes('phone') || (d.deviceName || '').toLowerCase().includes('android') || (d.deviceName || '').toLowerCase().includes('ios') || (d.deviceName || '').toLowerCase().includes('safari');

                        return (
                          <div 
                            key={d.id} 
                            className={`flex items-center justify-between p-4 ${isCurrent ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50'} rounded-xl`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={isCurrent ? 'text-indigo-400' : 'text-slate-500'}>
                                {isMobile ? (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                ) : (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{d.deviceName || (isMobile ? 'Mobile Browser' : 'Desktop Browser')}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {isCurrent ? 'Current session • ' : `Last active ${formatTimeAgo(d.lastLoginAt)} • `}
                                  {d.ipAddress || '127.0.0.1'}
                                </p>
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Active</span>
                            ) : (
                              <button 
                                onClick={() => handleRevokeDevice(d.id)}
                                className="text-xs font-bold text-slate-400 hover:text-red-400 transition-colors uppercase tracking-wider"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {devices.length > 1 && (
                      <button 
                        onClick={handleRevokeAllOtherSessions}
                        className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Sign out of all other sessions
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* --- NOTIFICATIONS TAB --- */}
              {activeTab === 'notifications' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Notification Preferences</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Choose what events trigger alerts.</p>

                    {notifSuccessMsg && (
                      <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg animate-in fade-in duration-200">
                        {notifSuccessMsg}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <ToggleSwitch 
                        label="Security Alerts" 
                        description="Intrusion detection, suspicious IP access, and unauthorized API calls." 
                        stateKey="securityAlerts" 
                      />
                      <ToggleSwitch 
                        label="Failed Activation Alerts" 
                        description="Get notified when a license activation fails repeatedly." 
                        stateKey="failedActivations" 
                      />
                      <ToggleSwitch 
                        label="Unbind Request Alerts" 
                        description="Get notified when a user submits a new hardware unbind request." 
                        stateKey="unbindRequests" 
                      />
                      <ToggleSwitch 
                        label="License Expiration Alerts" 
                        description="Weekly summary of enterprise licenses expiring soon." 
                        stateKey="licenseExpiration" 
                      />
                      <ToggleSwitch 
                        label="New User/Company Alerts" 
                        description="Alerts when a new enterprise company registers on the platform." 
                        stateKey="newUserAlerts" 
                      />
                      <ToggleSwitch 
                        label="System Notifications" 
                        description="Maintenance windows, database backups, and platform updates." 
                        stateKey="systemNotifications" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- APPEARANCE TAB --- */}
              {activeTab === 'appearance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Theme & Display</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Customize the look and feel of your dashboard.</p>
                    
                    {appearanceMsg && (
                      <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span>{appearanceMsg}</span>
                      </div>
                    )}

                    <div className="space-y-6">
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Theme Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button 
                            type="button"
                            onClick={() => handleThemeChange('Light')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                              themeMode === 'Light'
                                ? 'bg-indigo-500/15 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500 opacity-60 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center border ${
                              themeMode === 'Light' ? 'border-indigo-500 bg-white text-indigo-600' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
                            }`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </div>
                            <span className="text-xs font-bold">Light</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleThemeChange('Dark')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                              themeMode === 'Dark'
                                ? 'bg-indigo-500/15 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500 opacity-60 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center border ${
                              themeMode === 'Dark' ? 'border-indigo-500 bg-[#0b0f19] text-indigo-400' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#0b0f19] text-slate-400'
                            }`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                            </div>
                            <span className="text-xs font-bold">Dark</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleThemeChange('System')}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                              themeMode === 'System'
                                ? 'bg-indigo-500/15 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500 opacity-60 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center border ${
                              themeMode === 'System' ? 'border-indigo-500 bg-gradient-to-br from-white to-[#0b0f19] text-white shadow-inner backdrop-blur' : 'border-slate-300 dark:border-slate-500 bg-gradient-to-br from-white to-[#0b0f19] text-white shadow-inner backdrop-blur'
                            }`}>
                              <svg className="w-5 h-5 text-white mix-blend-difference" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <span className="text-xs font-bold">System</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Accent Color</label>
                        <div className="flex space-x-3">
                          {ACCENT_SWATCHES.map((swatch) => {
                            const isSelected = (accentColor || 'indigo') === swatch.id;
                            return (
                              <button 
                                key={swatch.id}
                                type="button"
                                onClick={() => handleAccentChange(swatch.id)}
                                title={swatch.name}
                                style={{ backgroundColor: swatch.hex }}
                                className={`w-9 h-9 rounded-full swatch-circle flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-[#111827] scale-110 opacity-100 shadow-lg'
                                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                        <ToggleSwitch 
                          label="Sidebar Expanded by Default" 
                          description="Keep the navigation sidebar expanded instead of collapsed." 
                          stateKey="sidebarExpanded" 
                        />
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* --- PRIVACY & DATA TAB --- */}
              {activeTab === 'privacy' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Privacy & Data Management</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Control your personal data and application footprints.</p>
                    
                    {privacyMsg.text && (
                      <div className={`p-4 mb-6 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                        privacyMsg.type === 'error' 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <span>{privacyMsg.text}</span>
                        <button onClick={() => setPrivacyMsg({ type: '', text: '' })} className="hover:opacity-75 ml-2 font-bold text-sm">✕</button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 rounded-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">Download Personal Data</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Export a JSON file of your account data.</p>
                          </div>
                          <button 
                            onClick={handleExportPersonalData}
                            disabled={exportingData}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            {exportingData ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span>Exporting...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                <span>Export Data</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700/50 rounded-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">Login History</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Download a CSV of your last 90 days of sign-ins.</p>
                          </div>
                          <button 
                            onClick={handleDownloadLoginHistory}
                            disabled={downloadingHistory}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            {downloadingHistory ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                <span>Download CSV</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <ToggleSwitch 
                          label="Save Local Preferences" 
                          description="Store UI preferences in your browser's LocalStorage." 
                          stateKey="localPreferences" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your account credentials</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsPasswordModalOpen(false); setPasswordMsg({ type: '', text: '' }); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {passwordMsg.text && (
              <div className={`mb-4 p-3 rounded-lg text-xs font-semibold ${passwordMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
                  >
                    {showPassword.current ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.next ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, next: !showPassword.next })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
                  >
                    {showPassword.next ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
                  >
                    {showPassword.confirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsPasswordModalOpen(false); setPasswordMsg({ type: '', text: '' }); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TwoFactorSetupModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        userEmail={profile?.email} 
        onSuccess={() => {
          setSuccessMsg('2FA has been successfully enabled');
          setProfile({...profile, twoFactorEnabled: true});
        }} 
      />
    </div>
  );
}
