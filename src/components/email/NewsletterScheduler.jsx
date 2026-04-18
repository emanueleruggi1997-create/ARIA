import React, { useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';

const C = {
  bg: '#070B14', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF',
  muted: '#5A7A9A', success: '#00E5A0', warning: '#FF9500',
};

const DAYS_IT = [
  { id: 'mon', label: 'Lunedì', short: 'Lun', openRate: 21 },
  { id: 'tue', label: 'Martedì', short: 'Mar', openRate: 28, recommended: true },
  { id: 'wed', label: 'Mercoledì', short: 'Mer', openRate: 26 },
  { id: 'thu', label: 'Giovedì', short: 'Gio', openRate: 24 },
  { id: 'fri', label: 'Venerdì', short: 'Ven', openRate: 19 },
  { id: 'sat', label: 'Sabato', short: 'Sab', openRate: 14 },
  { id: 'sun', label: 'Domenica', short: 'Dom', openRate: 11 },
];

const DAYS_EN = [
  { id: 'mon', label: 'Monday', short: 'Mon', openRate: 21 },
  { id: 'tue', label: 'Tuesday', short: 'Tue', openRate: 28, recommended: true },
  { id: 'wed', label: 'Wednesday', short: 'Wed', openRate: 26 },
  { id: 'thu', label: 'Thursday', short: 'Thu', openRate: 24 },
  { id: 'fri', label: 'Friday', short: 'Fri', openRate: 19 },
  { id: 'sat', label: 'Saturday', short: 'Sat', openRate: 14 },
  { id: 'sun', label: 'Sunday', short: 'Sun', openRate: 11 },
];

const TIME_SLOTS = ['8:00', '9:00', '10:00', '11:00', '14:00', '16:00'];

export default function NewsletterScheduler({ templates = [], lang = 'en', onActivate }) {
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState('all');
  const [selectedDay, setSelectedDay] = useState('tue');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [activated, setActivated] = useState(false);

  const DAYS = lang === 'en' ? DAYS_EN : DAYS_IT;
  const selectedDayObj = DAYS.find(d => d.id === selectedDay);
  
  const audienceOptions = lang === 'en'
    ? [
        { id: 'all', label: 'All contacts', count: 120 },
        { id: 'hot', label: 'Hot leads only', count: 12 },
        { id: 'warm', label: 'Warm leads only', count: 34 },
        { id: 'custom', label: 'Custom segment', count: 0 },
      ]
    : [
        { id: 'all', label: 'Tutti i contatti', count: 120 },
        { id: 'hot', label: 'Solo hot leads', count: 12 },
        { id: 'warm', label: 'Solo warm leads', count: 34 },
        { id: 'custom', label: 'Segmento personalizzato', count: 0 },
      ];

  const handleActivate = () => {
    setActivated(true);
    const nextSend = new Date();
    const daysToAdd = DAYS.findIndex(d => d.id === selectedDay) - nextSend.getDay();
    if (daysToAdd <= 0) nextSend.setDate(nextSend.getDate() + daysToAdd + 7);
    else nextSend.setDate(nextSend.getDate() + daysToAdd);
    
    if (onActivate) onActivate({ audience, day: selectedDay, time: selectedTime, template: selectedTemplate });
  };

  if (activated) {
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 8 }}>
          {lang === 'en' ? 'Newsletter scheduled' : 'Newsletter programmata'}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
          {lang === 'en'
            ? `Every ${selectedDayObj?.label} at ${selectedTime} AM — managed by ARIA`
            : `Ogni ${selectedDayObj?.label} alle ${selectedTime} — gestita da ARIA`}
        </div>
        <button onClick={() => setActivated(false)} style={{
          background: `${C.accent2}22`, border: `1px solid ${C.accent2}44`,
          borderRadius: 8, padding: '10px 20px', color: C.accent2,
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {lang === 'en' ? 'Edit settings' : 'Modifica impostazioni'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step indicator */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24,
      }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step >= s ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
              border: `1px solid ${step >= s ? C.accent2 : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: step >= s ? '#fff' : C.muted,
            }}>
              {s}
            </div>
            {s < 5 && (
              <div style={{
                flex: 1, height: 2, margin: '0 8px',
                background: step > s ? `linear-gradient(90deg, ${C.accent2}, ${C.accent})` : C.border,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Audience */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Step 1: Choose your audience' : 'Step 1: Scegli il tuo pubblico'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audienceOptions.map(opt => (
              <label key={opt.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                background: audience === opt.id ? `${C.accent2}22` : C.card,
                border: `1px solid ${audience === opt.id ? C.accent2 : C.border}`,
                borderRadius: 10, cursor: 'pointer',
              }}>
                <input type="radio" name="audience" value={opt.id} checked={audience === opt.id}
                  onChange={() => setAudience(opt.id)} style={{ cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text }}>{opt.label}</div>
                  {opt.count > 0 && <div style={{ fontSize: 11, color: C.muted }}>{opt.count} {lang === 'en' ? 'contacts' : 'contatti'}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Day */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Step 2: Choose sending day' : 'Step 2: Scegli il giorno di invio'}
          </div>
          <div style={{
            background: `${C.accent2}11`, border: `1px solid ${C.accent2}33`,
            borderRadius: 10, padding: 12, marginBottom: 12,
            fontSize: 12, color: C.muted,
          }}>
            {lang === 'en'
              ? `★ ARIA recommends ${selectedDayObj?.label} — highest open rate for B2B`
              : `★ ARIA consiglia ${selectedDayObj?.label} — tasso di apertura più alto per B2B`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {DAYS.map(day => (
              <button key={day.id} onClick={() => setSelectedDay(day.id)} style={{
                padding: 12, borderRadius: 10, fontWeight: 700,
                background: selectedDay === day.id ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
                border: selectedDay === day.id ? 'none' : `1px solid ${C.border}`,
                color: selectedDay === day.id ? '#fff' : C.text,
                cursor: 'pointer', fontFamily: 'inherit',
                position: 'relative', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
              }}>
                <span>{day.short}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{day.openRate}%</span>
                {day.recommended && (
                  <Star size={12} style={{ position: 'absolute', top: 4, right: 4, fill: '#FFD700' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Time */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Step 3: Choose sending time' : 'Step 3: Scegli l\'ora di invio'}
          </div>
          <div style={{
            background: `${C.success}11`, border: `1px solid ${C.success}33`,
            borderRadius: 10, padding: 12, marginBottom: 12,
            fontSize: 12, color: C.muted,
          }}>
            ★ {lang === 'en' ? 'Peak engagement time' : 'Orario di picco engagement'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TIME_SLOTS.map(time => (
              <button key={time} onClick={() => setSelectedTime(time)} style={{
                padding: 14, borderRadius: 10, fontWeight: 700, fontSize: 13,
                background: selectedTime === time ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
                border: selectedTime === time ? 'none' : `1px solid ${C.border}`,
                color: selectedTime === time ? '#fff' : C.text,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {time === '10:00' ? `★ ${time}` : time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Template */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Step 4: Select template' : 'Step 4: Seleziona template'}
          </div>
          <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 12, color: C.text, fontFamily: 'inherit', fontSize: 13,
            cursor: 'pointer',
          }}>
            <option value="">{lang === 'en' ? 'Choose a template...' : 'Scegli un template...'}</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedTemplate && (
            <div style={{
              background: `${C.accent}11`, border: `1px solid ${C.accent}33`,
              borderRadius: 10, padding: 12, fontSize: 12, color: C.muted,
            }}>
              {lang === 'en' ? 'Preview: Template selected ✓' : 'Anteprima: Template selezionato ✓'}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Activate */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Step 5: Activate recurring send' : 'Step 5: Attiva invio ricorrente'}
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 16,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            cursor: 'pointer',
          }}>
            <input type="checkbox" checked={autoSend} onChange={e => setAutoSend(e.target.checked)}
              style={{ width: 20, height: 20, cursor: 'pointer' }} />
            <div>
              <div style={{ fontWeight: 700, color: C.text }}>
                {lang === 'en' ? 'Send every week automatically' : 'Invia ogni settimana automaticamente'}
              </div>
              {autoSend && (
                <div style={{ fontSize: 12, color: C.success, marginTop: 4 }}>
                  {lang === 'en'
                    ? `Next send: ${selectedDayObj?.label} ${selectedDayObj?.label} at ${selectedTime} AM`
                    : `Prossimo invio: ${selectedDayObj?.label} alle ${selectedTime}`}
                </div>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} style={{
          flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 12, color: C.text, fontWeight: 700, cursor: step === 1 ? 'not-allowed' : 'pointer',
          opacity: step === 1 ? 0.5 : 1, fontFamily: 'inherit',
        }}>
          {lang === 'en' ? 'Previous' : 'Precedente'}
        </button>
        {step < 5 ? (
          <button onClick={() => setStep(step + 1)} style={{
            flex: 1, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
            border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {lang === 'en' ? 'Next' : 'Successivo'} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleActivate} disabled={!selectedTemplate || !autoSend} style={{
            flex: 1, background: autoSend && selectedTemplate ? `linear-gradient(135deg, ${C.success}, #00a87a)` : C.card,
            border: 'none', borderRadius: 10, padding: 12, color: autoSend && selectedTemplate ? '#fff' : C.muted,
            fontWeight: 700, cursor: autoSend && selectedTemplate ? 'pointer' : 'not-allowed',
            opacity: autoSend && selectedTemplate ? 1 : 0.5, fontFamily: 'inherit',
          }}>
            🚀 {lang === 'en' ? 'Activate Newsletter' : 'Attiva Newsletter'}
          </button>
        )}
      </div>
    </div>
  );
}