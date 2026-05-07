import React, { useState } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500',
};

export default function StepSchedule({ form, setField, audienceCount, onBack, onSave, saving }) {
  const [sendMode, setSendMode] = useState('now'); // 'now' | 'schedule' | 'recurring'
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [recurUnit, setRecurUnit] = useState('week');
  const [recurDay, setRecurDay] = useState('martedi');
  const [recurTime, setRecurTime] = useState('10:00');

  const DAYS = [
    { id: 'lunedi', label: 'Lun' }, { id: 'martedi', label: 'Mar' },
    { id: 'mercoledi', label: 'Mer' }, { id: 'giovedi', label: 'Gio' },
    { id: 'venerdi', label: 'Ven' }, { id: 'sabato', label: 'Sab' },
    { id: 'domenica', label: 'Dom' },
  ];

  const isNewsletter = form.templateId === 'newsletter';

  const handleConfirm = () => {
    if (sendMode === 'now') {
      onSave('bozza', '');
    } else if (sendMode === 'schedule') {
      const dt = schedDate && schedTime ? `${schedDate}T${schedTime}` : '';
      onSave('schedulata', dt);
    } else {
      onSave('schedulata', '');
    }
  };

  const canConfirm =
    sendMode === 'now' ||
    (sendMode === 'schedule' && schedDate) ||
    sendMode === 'recurring';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Programmazione</div>
        <div style={{ fontSize: 13, color: C.muted }}>Scegli quando inviare la campagna.</div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { id: 'now', icon: '⚡', label: 'Invia ora', desc: 'La campagna parte immediatamente' },
          { id: 'schedule', icon: '📅', label: 'Programma per dopo', desc: 'Scegli data e ora specifiche' },
          ...(isNewsletter ? [{ id: 'recurring', icon: '🔁', label: 'Ricorrente', desc: 'Si invia automaticamente ogni settimana/mese' }] : []),
        ].map(opt => (
          <div key={opt.id} onClick={() => setSendMode(opt.id)} style={{
            background: sendMode === opt.id ? C.accent2 + '15' : C.card,
            border: `2px solid ${sendMode === opt.id ? C.accent2 : C.border}`,
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{opt.desc}</div>
            </div>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${sendMode === opt.id ? C.accent2 : C.border}`,
              background: sendMode === opt.id ? C.accent2 : 'transparent',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {sendMode === opt.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule date/time */}
      {sendMode === 'schedule' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Data</div>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{
                width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ora</div>
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={{
                width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
          </div>
          {/* ARIA suggestion */}
          <div style={{ background: C.accent2 + '11', border: `1px solid ${C.accent2}33`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.muted }}>
            📊 <strong style={{ color: C.accent2 }}>ARIA suggerisce:</strong> Martedì alle 10:00 ha il miglior open rate per la maggior parte dei settori.
          </div>
        </div>
      )}

      {/* Recurring */}
      {sendMode === 'recurring' && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Frequenza</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'week', label: 'Settimanale' }, { id: 'month', label: 'Mensile' }].map(u => (
                <button key={u.id} onClick={() => setRecurUnit(u.id)} style={{
                  background: recurUnit === u.id ? C.accent2 + '22' : C.surface,
                  border: `1px solid ${recurUnit === u.id ? C.accent2 : C.border}`,
                  borderRadius: 8, padding: '7px 14px',
                  color: recurUnit === u.id ? C.accent2 : C.muted,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>{u.label}</button>
              ))}
            </div>
          </div>
          {recurUnit === 'week' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Giorno</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAYS.map(d => (
                  <button key={d.id} onClick={() => setRecurDay(d.id)} style={{
                    background: recurDay === d.id ? C.accent2 : C.surface,
                    border: `1px solid ${recurDay === d.id ? C.accent2 : C.border}`,
                    borderRadius: 8, padding: '6px 8px',
                    color: recurDay === d.id ? '#fff' : C.muted,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{d.label}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ora</div>
            <input type="time" value={recurTime} onChange={e => setRecurTime(e.target.value)} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '9px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }} />
          </div>
        </div>
      )}

      {/* Review summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Riepilogo</div>
        {[
          { label: 'Oggetto', val: form.oggetto || '—' },
          { label: 'Destinatari', val: `${audienceCount} contatti` },
          { label: 'Invio', val: sendMode === 'now' ? 'Ora' : sendMode === 'recurring' ? 'Ricorrente' : (schedDate ? `${schedDate} ore ${schedTime}` : '—') },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: C.muted }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.val}</span>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Indietro</button>
        <button onClick={handleConfirm} disabled={!canConfirm || saving} style={{
          flex: 2,
          background: canConfirm ? `linear-gradient(135deg, ${C.success}, #00a87a)` : C.card,
          border: 'none', borderRadius: 10, padding: '11px 0',
          color: canConfirm ? '#fff' : C.muted, fontSize: 13, fontWeight: 800,
          cursor: canConfirm && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          {saving ? '⏳ Salvataggio...' : '✓ Conferma e invia'}
        </button>
      </div>
    </div>
  );
}