import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panelSoft: 'var(--panel-soft)',
        ink: 'var(--ink)',
        inkMuted: 'var(--ink-muted)',
        accent: 'var(--accent)',
        accentStrong: 'var(--accent-strong)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        border: 'var(--border)',
      },
      boxShadow: {
        panel: '0 14px 36px -22px rgba(13, 36, 68, 0.28)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};

export default config;