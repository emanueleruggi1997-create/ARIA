import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { THEMES, FONTS, DASHBOARD_BGS, SIDEBAR_MODES, DENSITIES, applyTheme, loadFont } from '@/lib/useTheme';
import DashboardBgPreview from './DashboardBgPreview';

const DEFAULT_PREFS = {
  theme_name: 'emaral',
  theme_accent: '#3B6EF8',
  theme_bg: '#080A0F',
  dashboard_bg: 'pure',
  font_family: 'inter',
  sidebar_mode: 'expanded',
  density: 'normal',
  custom_bg_url: '',
  sync_aria_color: false,
};

export default function TabAspetto({ business, onSave }) {
  const [prefs, setPrefs] = useState(() => ({
    theme_name:     business?.theme_name     || DEFAULT_PREFS.theme_name,
    theme_accent:   business?.theme_accent   || DEFAULT_PREFS.theme_accent,
    theme_bg:       business?.theme_bg       || DEFAULT_PREFS.theme_bg,
    dashboard_bg:   business?.dashboard_bg   || DEFAULT_PREFS.dashboard_bg,
    font_family:    business?.font_family    || DEFAULT_PREFS.font_family,
    sidebar_mode:   business?.sidebar_mode   || DEFAULT_PREFS.sidebar_mode,
    density:        business?.density        || DEFAULT_PREFS.density,
    custom_bg_url:  business?.custom_bg_url  || '',
    sync_aria_color: business?.sync_aria_color || false,
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileRef = useRef();

  const update = (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }));
    // Apply immediately
    if (key === 'theme_accent' || key === 'theme_bg') {
      const newAccent = key === 'theme_accent' ? value : prefs.theme_accent;
      const newBg = key === 'theme_bg' ? value : prefs.theme_bg;
      applyTheme({ accent: newAccent, bg: newBg });
    }
    if (key === 'font_family') { loadFont(value); applyTheme({ font: value }); }
    if (key === 'density') applyTheme({ density: value });
  };

  const selectTheme = (theme) => {
    if (theme.id === 'custom') {
      update('theme_name', 'custom');
      return;
    }
    setPrefs(p => ({ ...p, theme_name: theme.id, theme_accent: theme.accent, theme_bg: theme.bg }));
    applyTheme({ accent: theme.accent, bg: theme.bg });
  };

  const handleSave = async () => {
    setSaving(true);
    const extra = prefs.sync_aria_color ? { aria_color: prefs.theme_accent, robot_color: prefs.theme_accent } : {};
    await onSave({ ...prefs, ...extra });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    applyTheme({ accent: DEFAULT_PREFS.theme_accent, bg: DEFAULT_PREFS.theme_bg, font: 'inter', density: 'normal' });
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update('custom_bg_url', file_url);
    update('dashboard_bg', 'custom-img');
    setUploadingBg(false);
  };

  const currentAccent = prefs.theme_accent || '#3B6EF8';

  return (
    <div className="space-y-8 pb-8">

      {/* ── ANTEPRIMA LIVE ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Anteprima live</p>
        <LivePreview prefs={prefs} />
      </div>

      {/* ── TEMI COLORE ── */}
      <Section title="Tema principale" sub="Cambia i colori di tutta l'app">
        <div className="grid grid-cols-4 gap-3">
          {THEMES.map(t => {
            const active = prefs.theme_name === t.id;
            const accent = t.accent || prefs.theme_accent;
            const bg = t.bg || prefs.theme_bg;
            return (
              <button
                key={t.id}
                onClick={() => selectTheme(t)}
                className={cn(
                  "relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03]",
                  active ? "border-white shadow-lg" : "border-transparent"
                )}
                style={{ height: 80 }}
              >
                {/* mini preview */}
                <div style={{ background: bg, width: '100%', height: '100%', position: 'relative' }}>
                  {/* fake sidebar strip */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '22%', background: `${bg}ee`, borderRight: `1px solid ${accent}22` }} />
                  {/* accent bar */}
                  <div style={{ position: 'absolute', top: 8, left: '28%', right: 8, height: 6, borderRadius: 3, background: accent, opacity: 0.9 }} />
                  <div style={{ position: 'absolute', top: 20, left: '28%', right: 20, height: 3, borderRadius: 3, background: accent, opacity: 0.4 }} />
                  <div style={{ position: 'absolute', top: 28, left: '28%', right: 32, height: 3, borderRadius: 3, background: accent, opacity: 0.25 }} />
                  {/* dots */}
                  {[0,1,2].map(i => (
                    <div key={i} style={{ position: 'absolute', left: '5%', top: 12 + i * 14, width: 10, height: 10, borderRadius: '50%', background: accent, opacity: active ? 0.8 : 0.4 }} />
                  ))}
                </div>
                {active && (
                  <div style={{ position: 'absolute', top: 4, right: 4, background: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>✓</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '2px 4px', fontSize: 9, fontWeight: 700, color: active ? accent : '#aaa', textAlign: 'center', letterSpacing: '0.05em' }}>
                  {active ? '● ATTIVO' : t.id === 'custom' ? '+ Custom' : t.label.toUpperCase()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Color pickers per custom */}
        {prefs.theme_name === 'custom' && (
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Colore accento</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={prefs.theme_accent} onChange={e => update('theme_accent', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent" />
                <span className="text-sm font-mono text-muted-foreground">{prefs.theme_accent}</span>
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Colore sfondo</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={prefs.theme_bg} onChange={e => update('theme_bg', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent" />
                <span className="text-sm font-mono text-muted-foreground">{prefs.theme_bg}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sync ARIA */}
        <div className="flex items-center justify-between mt-4 p-3 rounded-xl border border-border bg-card">
          <div>
            <p className="text-sm font-medium text-foreground">🔗 Sincronizza colore ARIA col tema</p>
            <p className="text-xs text-muted-foreground">Il robot prenderà il colore accento del tema</p>
          </div>
          <Switch checked={prefs.sync_aria_color} onCheckedChange={v => update('sync_aria_color', v)} />
        </div>
      </Section>

      {/* ── SFONDO DASHBOARD ── */}
      <Section title="Sfondo dashboard" sub="Personalizza lo sfondo della tua dashboard principale">
        <div className="grid grid-cols-3 gap-3">
          {DASHBOARD_BGS.map(bg => {
            const active = prefs.dashboard_bg === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => { update('dashboard_bg', bg.id); if (bg.id === 'custom-img') fileRef.current?.click(); }}
                className={cn(
                  "relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                  active ? "border-white" : "border-transparent border border-border"
                )}
                style={{ height: 72 }}
              >
                <DashboardBgPreview type={bg.id} accent={currentAccent} bgUrl={prefs.custom_bg_url} />
                {active && (
                  <div style={{ position: 'absolute', top: 3, right: 3, background: 'white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000' }}>✓</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', padding: '2px 4px', fontSize: 9, fontWeight: 700, color: active ? '#fff' : '#888', textAlign: 'center' }}>
                  {bg.label.toUpperCase()}
                </div>
              </button>
            );
          })}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBgUpload} />
        {uploadingBg && <p className="text-xs text-muted-foreground mt-2">Caricamento immagine...</p>}
        {prefs.dashboard_bg === 'custom-img' && prefs.custom_bg_url && (
          <p className="text-xs text-green-400 mt-2">✓ Immagine caricata</p>
        )}
      </Section>

      {/* ── FONT ── */}
      <Section title="Font" sub="Scegli il carattere tipografico dell'app">
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map(f => {
            const active = prefs.font_family === f.id;
            const fontStyle = f.id === 'poppins' ? "'Poppins', sans-serif"
              : f.id === 'space-grotesk' ? "'Space Grotesk', sans-serif"
              : f.id === 'playfair' ? "'Playfair Display', serif"
              : "'Inter', sans-serif";
            return (
              <button key={f.id} onClick={() => update('font_family', f.id)}
                className={cn("flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left", active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                <p className="text-base font-semibold text-foreground leading-tight" style={{ fontFamily: fontStyle }}>{f.sample}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── SIDEBAR ── */}
      <Section title="Sidebar" sub="Modalità di visualizzazione del menu laterale">
        <div className="grid grid-cols-3 gap-3">
          {SIDEBAR_MODES.map(m => {
            const active = prefs.sidebar_mode === m.id;
            return (
              <button key={m.id} onClick={() => update('sidebar_mode', m.id)}
                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all", active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}>
                <SidebarModeIcon mode={m.id} active={active} accent={currentAccent} />
                <p className="text-xs font-semibold text-foreground">{m.label}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── DENSITÀ ── */}
      <Section title="Densità interfaccia" sub="Controlla quanto spazio occupa l'interfaccia">
        <div className="flex gap-2">
          {DENSITIES.map(d => (
            <button key={d.id} onClick={() => update('density', d.id)}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                prefs.density === d.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40")}>
              {d.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── AZIONI ── */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1 font-semibold" style={{ background: currentAccent, minHeight: 44 }}>
          {saving ? 'Salvataggio...' : saved ? '✓ Salvato!' : 'Applica'}
        </Button>
        <Button onClick={handleReset} variant="outline" className="px-6">Ripristina default</Button>
      </div>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function SidebarModeIcon({ mode, active, accent }) {
  const color = active ? accent : '#4B5563';
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      <rect x="0.5" y="0.5" width="47" height="31" rx="3.5" fill="#0F1219" stroke={color} strokeOpacity="0.3" />
      {mode !== 'hidden' && <rect x="1" y="1" width={mode === 'compact' ? 8 : 13} height="30" rx="2" fill={color} fillOpacity="0.15" />}
      {mode === 'hidden' && <rect x="1" y="1" width="47" height="5" rx="2" fill={color} fillOpacity="0.2" />}
      <rect x={mode === 'hidden' ? 4 : mode === 'compact' ? 11 : 16} y="8" width="20" height="3" rx="1" fill={color} fillOpacity="0.5" />
      <rect x={mode === 'hidden' ? 4 : mode === 'compact' ? 11 : 16} y="14" width="15" height="2" rx="1" fill={color} fillOpacity="0.3" />
      <rect x={mode === 'hidden' ? 4 : mode === 'compact' ? 11 : 16} y="19" width="18" height="2" rx="1" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

function LivePreview({ prefs }) {
  const theme = THEMES.find(t => t.id === prefs.theme_name);
  const accent = prefs.theme_accent || theme?.accent || '#3B6EF8';
  const bg = prefs.theme_bg || theme?.bg || '#080A0F';
  const sidebarWidth = prefs.sidebar_mode === 'hidden' ? 0 : prefs.sidebar_mode === 'compact' ? 24 : 60;
  const padY = prefs.density === 'comfortable' ? 10 : prefs.density === 'compact' ? 4 : 7;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${accent}33`, width: '100%', height: 120, background: bg, display: 'flex' }}>
      {/* Sidebar */}
      {prefs.sidebar_mode !== 'hidden' && (
        <div style={{ width: sidebarWidth, background: `${bg}`, borderRight: `1px solid ${accent}22`, flexShrink: 0, padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 6, borderRadius: 3, background: i === 0 ? accent : `${accent}33`, opacity: i === 0 ? 1 : 0.6 }} />
          ))}
        </div>
      )}
      {/* Content */}
      <div style={{ flex: 1, padding: padY, position: 'relative', overflow: 'hidden' }}>
        <DashboardBgPreview type={prefs.dashboard_bg} accent={accent} bgUrl={prefs.custom_bg_url} absolute />
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, position: 'relative', zIndex: 1 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: `${bg}cc`, border: `1px solid ${accent}22`, borderRadius: 6, padding: 5 }}>
              <div style={{ height: 3, width: '60%', background: accent, borderRadius: 2, marginBottom: 3, opacity: 0.7 }} />
              <div style={{ height: 2, width: '40%', background: accent, borderRadius: 2, opacity: 0.3 }} />
            </div>
          ))}
        </div>
        {/* Chart placeholder */}
        <div style={{ marginTop: 6, background: `${bg}cc`, border: `1px solid ${accent}22`, borderRadius: 6, height: 40, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none">
            <polyline points="0,35 30,25 60,28 90,15 120,20 150,10 200,18" stroke={accent} strokeWidth="1.5" fill="none" strokeOpacity="0.7" />
            <polygon points="0,35 30,25 60,28 90,15 120,20 150,10 200,18 200,40 0,40" fill={accent} fillOpacity="0.08" />
          </svg>
        </div>
      </div>
    </div>
  );
}