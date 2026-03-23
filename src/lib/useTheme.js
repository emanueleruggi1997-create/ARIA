// Hook centralizzato per applicare il tema all'app

export const THEMES = [
  { id: 'emaral',         label: 'Emaral',        accent: '#3B6EF8', bg: '#080A0F' },
  { id: 'midnight-green', label: 'Midnight Green', accent: '#10B981', bg: '#050F0A' },
  { id: 'purple-dream',   label: 'Purple Dream',   accent: '#7C3AED', bg: '#0A080F' },
  { id: 'rose-gold',      label: 'Rose Gold',      accent: '#EC4899', bg: '#0F0808' },
  { id: 'sunset',         label: 'Sunset',         accent: '#F59E0B', bg: '#0F0A06' },
  { id: 'arctic',         label: 'Arctic',         accent: '#14B8A6', bg: '#060B0F' },
  { id: 'crimson',        label: 'Crimson',        accent: '#EF4444', bg: '#0F0608' },
  { id: 'custom',         label: 'Custom',         accent: null,      bg: null },
];

export const FONTS = [
  { id: 'inter',         label: 'Inter',               sample: 'Il tuo CRM personale', url: null },
  { id: 'poppins',       label: 'Poppins',             sample: 'Il tuo CRM personale', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { id: 'space-grotesk', label: 'Space Grotesk',       sample: 'Il tuo CRM personale', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { id: 'playfair',      label: 'Playfair + Inter',    sample: 'Il tuo CRM personale', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap' },
];

export const DASHBOARD_BGS = [
  { id: 'pure',        label: 'Puro' },
  { id: 'nebula',      label: 'Nebula' },
  { id: 'grid',        label: 'Griglia' },
  { id: 'dots',        label: 'Punti' },
  { id: 'waves',       label: 'Onde' },
  { id: 'circuits',    label: 'Circuiti' },
  { id: 'aurora',      label: 'Aurora' },
  { id: 'geometric',   label: 'Geometrico' },
  { id: 'custom-img',  label: 'Personalizzato' },
];

export const SIDEBAR_MODES = [
  { id: 'expanded', label: 'Espansa' },
  { id: 'compact',  label: 'Compatta' },
  { id: 'hidden',   label: 'Nascosta' },
];

export const DENSITIES = [
  { id: 'comfortable', label: 'Comoda' },
  { id: 'normal',      label: 'Normale' },
  { id: 'compact',     label: 'Compatta' },
];

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyTheme({ accent, bg, font, density }) {
  const root = document.documentElement;

  if (accent) {
    const hsl = hexToHsl(accent);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    root.style.setProperty('--chart-1', hsl);
  }

  if (bg) {
    const bgHsl = hexToHsl(bg);
    root.style.setProperty('--background', bgHsl);
    // slightly lighter for card/sidebar
    root.style.setProperty('--card', hexToHsl(lighten(bg, 3)));
    root.style.setProperty('--sidebar-background', hexToHsl(lighten(bg, 1)));
  }

  // Font
  if (font) {
    const fontMap = {
      'inter': "'Inter', sans-serif",
      'poppins': "'Poppins', sans-serif",
      'space-grotesk': "'Space Grotesk', sans-serif",
      'playfair': "'Playfair Display', 'Inter', sans-serif",
    };
    if (fontMap[font]) {
      root.style.setProperty('--font-inter', fontMap[font]);
    }
  }

  // Density
  if (density) {
    root.setAttribute('data-density', density);
  }
}

function lighten(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function loadFont(fontId) {
  const font = FONTS.find(f => f.id === fontId);
  if (!font?.url) return;
  if (document.querySelector(`link[href="${font.url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = font.url;
  document.head.appendChild(link);
}