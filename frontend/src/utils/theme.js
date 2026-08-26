/**
 * Unified Theme Engine for LockStrata
 * Canonical modes: 'Light' | 'Dark' | 'System'
 */

export function getSavedThemeMode() {
  return localStorage.getItem('themeMode') || 'Dark';
}

let isApplyingTheme = false;

export function applyThemeMode(mode) {
  if (isApplyingTheme) return mode;
  isApplyingTheme = true;
  try {
    const raw = String(mode || '').trim().toLowerCase();
    const normalizedMode = raw === 'light' ? 'Light' : raw === 'system' ? 'System' : 'Dark';
    localStorage.setItem('themeMode', normalizedMode);

    if (normalizedMode === 'Light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else if (normalizedMode === 'Dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      // System
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
    }

    window.dispatchEvent(new Event('theme-changed'));
    return normalizedMode;
  } finally {
    isApplyingTheme = false;
  }
}

/**
 * Attaches a system prefers-color-scheme listener to react dynamically
 * when OS theme changes and user is in 'System' mode.
 * Returns a cleanup function.
 */
export function initThemeSystemListener() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleSystemChange = (e) => {
    const currentMode = localStorage.getItem('themeMode') || 'Dark';
    if (currentMode === 'System') {
      if (e.matches) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
      window.dispatchEvent(new Event('theme-changed'));
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleSystemChange);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemChange);
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleSystemChange);
    }
  };
}
