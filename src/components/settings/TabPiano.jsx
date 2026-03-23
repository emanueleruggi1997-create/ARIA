import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PIANI = [
  {
    id: 'starter',
    label: 'Starter',
    prezzo: '49€',
    borderColor: '#7A8BA8',
    features: [
      { ok: true, text: 'Instagram DM automatico' },
      { ok: true, text: 'Facebook DM automatico' },
      { ok: true, text: 'Social posting (20 post/mese)' },
      { ok: true, text: 'CRM & Lead management' },
      { ok: true, text: 'Email marketing (1.000/mese)' },
      { ok: true, text: 'ARIA assistente AI' },
      { ok: true, text: 'Analytics base' },
      { ok: false, text: 'WhatsApp Business' },
      { ok: false, text: 'Account multipli' },
      { ok: false, text: 'White label' },
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    prezzo: '99€',
    badge: 'PIÙ SCELTO',
    borderColor: '#3B6EF8',
    features: [
      { ok: true, text: 'Tutto lo Starter +' },
      { ok: true, text: 'WhatsApp Business', new: true },
      { ok: true, text: '3 account gestibili' },
      { ok: true, text: 'Social posting (60 post/mese)' },
      { ok: true, text: 'Email marketing (10.000/mese)' },
      { ok: true, text: 'CRM + preventivi AI' },
      { ok: true, text: 'Analytics avanzata' },
      { ok: true, text: 'Supporto prioritario' },
      { ok: false, text: 'White label' },
      { ok: false, text: 'Account illimitati' },
    ],
  },
  {
    id: 'agency',
    label: 'Agency',
    prezzo: '249€',
    borderColor: '#7C3AED',
    features: [
      { ok: true, text: 'Tutto il Pro +' },
      { ok: true, text: 'Account illimitati' },
      { ok: true, text: 'White label completo' },
      { ok: true, text: 'Email illimitate' },
      { ok: true, text: 'API access' },
      { ok: true, text: 'Onboarding dedicato' },
      { ok: true, text: 'Canale supporto diretto' },
    ],
  },
];

const USAGE = [
  { label: 'Post pubblicati', valore: 8, limite: 20, unit: 'post' },
  { label: 'Email inviate', valore: 320, limite: 1000, unit: 'email' },
  { label: 'Account connessi', valore: 1, limite: 1, unit: 'account' },
  { label: 'Messaggi AI elaborati', valore: 1240, limite: null, unit: 'messaggi' },
];

function ProgressBar({ valore, limite }) {
  if (!limite) return null;
  const pct = Math.min((valore / limite) * 100, 100);
  const color = pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#10B981';
  return (
    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 999, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function TabPiano({ form, setForm, onSave }) {
  const pianoAttuale = form.piano || 'starter';
  const pianoInfo = PIANI.find(p => p.id === pianoAttuale);

  const handleUpgrade = async (id) => {
    setForm(p => ({ ...p, piano: id }));
    onSave({ piano: id });
  };

  return (
    <div className="space-y-6">
      {/* Piano attuale */}
      <div className="rounded-xl p-5 space-y-2" style={{ background: 'rgba(59,110,248,0.08)', border: '1px solid rgba(59,110,248,0.3)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Piano attuale</p>
            <p className="text-2xl font-bold text-foreground mt-0.5 capitalize">{pianoInfo?.label}</p>
            <p className="text-sm text-primary font-semibold">{pianoInfo?.prezzo}/mese</p>
            <p className="text-xs text-muted-foreground mt-1">Rinnovo: 22 Aprile 2026</p>
          </div>
          <Button style={{ background: '#3B6EF8', minHeight: 44, borderRadius: 10, fontWeight: 600 }}>
            Gestisci abbonamento
          </Button>
        </div>
      </div>

      {/* Cards piani */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Confronto piani</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PIANI.map(p => {
            const isActive = pianoAttuale === p.id;
            return (
              <div key={p.id} style={{
                background: '#0F1219',
                border: `1px solid rgba(255,255,255,0.07)`,
                borderTop: `3px solid ${p.borderColor}`,
                borderRadius: 14,
                padding: 20,
                position: 'relative',
              }}>
                {p.badge && (
                  <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    background: '#3B6EF8', color: 'white', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.08em', padding: '2px 10px', borderRadius: '0 0 8px 8px',
                  }}>
                    {p.badge}
                  </div>
                )}

                <p className="text-base font-bold text-foreground mt-2">{p.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: p.borderColor }}>{p.prezzo}<span className="text-sm text-muted-foreground font-normal">/mese</span></p>

                <ul className="mt-4 space-y-1.5">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      {f.ok
                        ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                        : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />}
                      <span className={cn(f.ok ? 'text-foreground' : 'text-muted-foreground/50', f.new && 'font-semibold text-green-400')}>
                        {f.text}
                        {f.new && <span className="ml-1 text-[9px] bg-green-400/10 text-green-400 px-1 py-0.5 rounded uppercase font-bold tracking-wide">Nuovo</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => !isActive && handleUpgrade(p.id)}
                  disabled={isActive}
                  className="w-full mt-4 font-semibold"
                  style={{
                    background: isActive ? 'transparent' : p.borderColor,
                    border: isActive ? `1px solid ${p.borderColor}` : 'none',
                    color: isActive ? p.borderColor : 'white',
                    minHeight: 44, borderRadius: 10,
                    opacity: isActive ? 0.7 : 1,
                  }}>
                  {isActive ? 'Piano attuale' : `Scegli ${p.label}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner offerta */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(59,110,248,0.06)', border: '1px solid rgba(59,110,248,0.2)' }}>
        <p className="text-sm font-semibold text-foreground">🎁 Prima iscrizione: 2 mesi al prezzo di 1</p>
        <p className="text-xs text-muted-foreground mt-1">Valido solo per i nuovi account</p>
      </div>

      {/* Uso attuale */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Il tuo utilizzo questo mese</h3>
        <div className="space-y-4">
          {USAGE.map(u => {
            const pct = u.limite ? Math.round((u.valore / u.limite) * 100) : null;
            return (
              <div key={u.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{u.label}</span>
                  <span className="text-xs text-foreground font-medium">
                    {u.valore.toLocaleString()}{u.limite ? `/${u.limite.toLocaleString()} ${u.unit}` : ` ${u.unit}`}
                  </span>
                </div>
                <ProgressBar valore={u.valore} limite={u.limite} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}