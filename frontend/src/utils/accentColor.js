export const ACCENT_PALETTES = {
  indigo: {
    name: 'Indigo',
    hex: '#6366f1',
    hover: '#4f46e5',
    ring: '#818cf8',
    rgb: '99, 102, 241',
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c7d2fe',
    '300': '#a5b4fc',
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
    '900': '#312e81',
    '950': '#1e1b4b',
  },
  blue: {
    name: 'Ocean Blue',
    hex: '#3b82f6',
    hover: '#2563eb',
    ring: '#60a5fa',
    rgb: '59, 130, 246',
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  emerald: {
    name: 'Emerald Green',
    hex: '#10b981',
    hover: '#059669',
    ring: '#34d399',
    rgb: '16, 185, 129',
    '50': '#ecfdf5',
    '100': '#d1fae5',
    '200': '#a7f3d0',
    '300': '#6ee7b7',
    '400': '#34d399',
    '500': '#10b981',
    '600': '#059669',
    '700': '#047857',
    '800': '#065f46',
    '900': '#064e3b',
    '950': '#022c22',
  },
  purple: {
    name: 'Royal Purple',
    hex: '#a855f7',
    hover: '#9333ea',
    ring: '#c084fc',
    rgb: '168, 85, 247',
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3b0764',
  },
  rose: {
    name: 'Rose Pink',
    hex: '#f43f5e',
    hover: '#e11d48',
    ring: '#fb7185',
    rgb: '244, 63, 94',
    '50': '#fff1f2',
    '100': '#ffe4e6',
    '200': '#fecdd3',
    '300': '#fda4af',
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
    '900': '#881337',
    '950': '#4c0519',
  },
  sky: {
    name: 'Sky Blue',
    hex: '#0284c7',
    hover: '#0369a1',
    ring: '#38bdf8',
    rgb: '2, 132, 199',
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c4a6e',
    '950': '#082f49',
  },
  orange: {
    name: 'Amber Orange',
    hex: '#ea580c',
    hover: '#c2410c',
    ring: '#fb923c',
    rgb: '234, 88, 12',
    '50': '#fff7ed',
    '100': '#ffedd5',
    '200': '#fed7aa',
    '300': '#fdba74',
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
    '900': '#7c2d12',
    '950': '#431407',
  },
  slate: {
    name: 'Slate Charcoal',
    hex: '#475569',
    hover: '#334155',
    ring: '#94a3b8',
    rgb: '71, 85, 105',
    '50': '#f8fafc',
    '100': '#f1f5f9',
    '200': '#e2e8f0',
    '300': '#cbd5e1',
    '400': '#94a3b8',
    '500': '#64748b',
    '600': '#475569',
    '700': '#334155',
    '800': '#1e293b',
    '900': '#0f172a',
    '950': '#020617',
  }
};

let isApplyingAccent = false;

export function applyAccentColor(colorName) {
  if (isApplyingAccent) return;
  isApplyingAccent = true;
  try {
    const rawKey = String(colorName || '').trim().toLowerCase();
    let palette = ACCENT_PALETTES[rawKey];
    if (!palette) {
      for (const p of Object.values(ACCENT_PALETTES)) {
        if (p.hex.toLowerCase() === rawKey) {
          palette = p;
          break;
        }
      }
    }
    if (!palette) palette = ACCENT_PALETTES.indigo;

    const canonicalId = Object.keys(ACCENT_PALETTES).find(k => ACCENT_PALETTES[k] === palette) || 'indigo';
    localStorage.setItem('accentColor', canonicalId);

    // 1. Set CSS custom properties on document.documentElement for Tailwind v4 runtime compilation
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    shades.forEach(s => {
      if (palette[s]) {
        document.documentElement.style.setProperty(`--color-indigo-${s}`, palette[s]);
        document.documentElement.style.setProperty(`--color-blue-${s}`, palette[s]);
      }
    });
    document.documentElement.style.setProperty('--app-accent-color', palette.hex);
    document.documentElement.style.setProperty('--app-accent-hover', palette.hover);
    document.documentElement.style.setProperty('--app-accent-ring', palette.ring);
    document.documentElement.style.setProperty('--app-accent-rgb', palette.rgb);

    // 2. Inject valid, bulletproof stylesheet overrides using standard attribute and class selectors
    let styleEl = document.getElementById('dynamic-accent');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-accent';
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      :root, :host {
        --color-indigo-50: ${palette['50']};
        --color-indigo-100: ${palette['100']};
        --color-indigo-200: ${palette['200']};
        --color-indigo-300: ${palette['300']};
        --color-indigo-400: ${palette['400']};
        --color-indigo-500: ${palette['500']};
        --color-indigo-600: ${palette['600']};
        --color-indigo-700: ${palette['700']};
        --color-indigo-800: ${palette['800']};
        --color-indigo-900: ${palette['900']};
        --color-indigo-950: ${palette['950']};

        --color-blue-50: ${palette['50']};
        --color-blue-100: ${palette['100']};
        --color-blue-200: ${palette['200']};
        --color-blue-300: ${palette['300']};
        --color-blue-400: ${palette['400']};
        --color-blue-500: ${palette['500']};
        --color-blue-600: ${palette['600']};
        --color-blue-700: ${palette['700']};
        --color-blue-800: ${palette['800']};
        --color-blue-900: ${palette['900']};
        --color-blue-950: ${palette['950']};

        --app-accent-color: ${palette.hex};
        --app-accent-hover: ${palette.hover};
        --app-accent-ring: ${palette.ring};
        --app-accent-rgb: ${palette.rgb};
      }

      /* Solid accent buttons, badges, and active icons (exclude swatch circles!) */
      [class~="bg-indigo-600"]:not(.swatch-circle),
      [class~="bg-indigo-500"]:not(.swatch-circle),
      [class~="bg-blue-600"]:not(.swatch-circle),
      [class~="bg-blue-500"]:not(.swatch-circle),
      [class~="bg-[#0f52ba]"]:not(.swatch-circle),
      [class~="bg-[#4f46e5]"]:not(.swatch-circle),
      .bg-indigo-600:not(.swatch-circle),
      .bg-indigo-500:not(.swatch-circle),
      .bg-blue-600:not(.swatch-circle),
      .bg-blue-500:not(.swatch-circle) {
        background-color: ${palette['600']} !important;
      }

      /* Hover states */
      [class*="hover:bg-indigo-700"]:hover,
      [class*="hover:bg-indigo-600"]:hover,
      [class*="hover:bg-indigo-500"]:hover,
      [class*="hover:bg-blue-700"]:hover,
      [class*="hover:bg-blue-600"]:hover,
      [class*="hover:bg-blue-500"]:hover {
        background-color: ${palette['700']} !important;
      }

      /* Primary text colors */
      [class~="text-indigo-600"],
      [class~="text-blue-600"],
      [class~="text-[#0f52ba]"],
      .text-indigo-600,
      .text-blue-600 {
        color: ${palette['600']} !important;
      }

      [class~="text-indigo-500"],
      [class~="text-blue-500"],
      .text-indigo-500,
      .text-blue-500 {
        color: ${palette['500']} !important;
      }

      [class~="text-indigo-400"],
      [class~="text-blue-400"],
      [class*="dark:text-indigo-400"],
      [class*="dark:text-blue-400"],
      .text-indigo-400,
      .text-blue-400 {
        color: ${palette['400']} !important;
      }

      /* Border colors */
      [class~="border-indigo-600"],
      [class~="border-blue-600"],
      .border-indigo-600,
      .border-blue-600 {
        border-color: ${palette['600']} !important;
      }

      [class~="border-indigo-500"],
      [class~="border-blue-500"],
      [class~="border-[#0f52ba]"],
      .border-indigo-500,
      .border-blue-500 {
        border-color: ${palette['500']} !important;
      }

      /* Focus and Ring states */
      [class*="focus:border-indigo-500"]:focus,
      [class*="focus:border-blue-500"]:focus {
        border-color: ${palette['500']} !important;
      }

      [class~="ring-indigo-500"],
      [class~="ring-blue-500"],
      [class*="focus:ring-indigo-500"]:focus,
      [class*="focus:ring-blue-500"]:focus {
        --tw-ring-color: ${palette.ring} !important;
      }

      /* Translucent / tinted active backgrounds */
      [class*="bg-indigo-500/20"],
      [class*="bg-blue-500/20"] {
        background-color: rgba(${palette.rgb}, 0.20) !important;
      }

      [class*="bg-indigo-500/15"],
      [class*="bg-blue-500/15"] {
        background-color: rgba(${palette.rgb}, 0.15) !important;
      }

      [class*="bg-indigo-500/10"],
      [class*="bg-blue-500/10"] {
        background-color: rgba(${palette.rgb}, 0.10) !important;
      }

      [class*="bg-indigo-600/20"],
      [class*="bg-blue-600/20"] {
        background-color: rgba(${palette.rgb}, 0.20) !important;
      }

      [class~="bg-indigo-50"],
      [class~="bg-blue-50"],
      .bg-indigo-50,
      .bg-blue-50 {
        background-color: ${palette['50']} !important;
      }

      /* Translucent / tinted borders */
      [class*="border-indigo-500/20"],
      [class*="border-blue-500/20"] {
        border-color: rgba(${palette.rgb}, 0.25) !important;
      }

      [class*="border-indigo-500/30"],
      [class*="border-blue-500/30"] {
        border-color: rgba(${palette.rgb}, 0.35) !important;
      }

      [class*="border-indigo-500/40"],
      [class*="border-blue-500/40"] {
        border-color: rgba(${palette.rgb}, 0.45) !important;
      }

      [class*="border-indigo-500/50"],
      [class*="border-blue-500/50"] {
        border-color: rgba(${palette.rgb}, 0.55) !important;
      }

      /* Box shadows and glow effects */
      [class*="shadow-indigo-"],
      [class*="shadow-blue-"] {
        --tw-shadow-color: rgba(${palette.rgb}, 0.25) !important;
      }

      [class*="shadow-[0_0_15px_rgba(99,102,241"] {
        box-shadow: 0 0 15px rgba(${palette.rgb}, 0.25) !important;
      }

      /* Active text selection */
      ::selection {
        background-color: rgba(${palette.rgb}, 0.30) !important;
      }
    `;

    window.dispatchEvent(new Event('accent-changed'));
  } finally {
    isApplyingAccent = false;
  }
}
