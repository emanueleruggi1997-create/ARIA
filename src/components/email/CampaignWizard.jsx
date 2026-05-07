import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import StepTemplate from './wizard/StepTemplate';
import StepContent from './wizard/StepContent';
import StepAudience from './wizard/StepAudience';
import StepSchedule from './wizard/StepSchedule';

const C = {
  bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const STEPS = [
  { n: 1, label: 'Template' },
  { n: 2, label: 'Contenuto' },
  { n: 3, label: 'Audience' },
  { n: 4, label: 'Invio' },
];

const DEFAULT_STYLE = {
  bgColor: '#ffffff',
  textColor: '#1a1a1a',
  accentColor: '#7B2FFF',
  font: 'Arial',
  showLogo: false,
};

const EMPTY_FORM = {
  templateId: null,
  templateName: '',
  templateCategory: '',
  oggetto: '',
  body: '',
  destinatari_tag: 'tutti',
  emailStyle: DEFAULT_STYLE,
};

export default function CampaignWizard({ businessId, emailContacts, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const setField = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const validContacts = emailContacts.filter(c => c.email?.includes('@') && c.stato === 'attivo');

  const getAudienceCount = () => {
    const tag = form.destinatari_tag;
    if (tag === 'tutti') return validContacts.length;
    return validContacts.filter(c => c.fonte === tag).length;
  };

  const handleSave = async (stato = 'bozza', scheduled_at = '') => {
    setSaving(true);
    try {
      await base44.entities.EmailCampaign.create({
        business_id: businessId,
        nome: form.templateName || form.oggetto || 'Campagna',
        oggetto: form.oggetto,
        destinatari_tag: form.destinatari_tag,
        destinatari_count: getAudienceCount(),
        stato,
        scheduled_at: scheduled_at || '',
        template_id: form.templateId || '',
        preview_text: form.body?.substring(0, 100) || '',
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#000000dd', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
      padding: isMobile ? 0 : '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: isMobile ? '100%' : 900,
        background: C.surface, borderRadius: isMobile ? '20px 20px 0 0' : 20,
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        maxHeight: isMobile ? '95dvh' : '92vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: C.text }}>📧 Nuova Campagna Email</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    background: step === s.n ? C.accent2 : step > s.n ? C.success : C.card,
                    color: step >= s.n ? '#fff' : C.muted,
                    border: `2px solid ${step === s.n ? C.accent2 : step > s.n ? C.success : C.border}`,
                    transition: 'all 0.3s',
                  }}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <div style={{ fontSize: 9, color: step === s.n ? C.accent2 : step > s.n ? C.success : C.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > s.n ? C.success : C.border, margin: '0 4px', marginBottom: 16, transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && (
            <>
              <StepTemplate
                selected={form.templateId}
                onSelect={(tmpl, style) => {
                  setForm(p => ({
                    ...p,
                    templateId: tmpl.id,
                    templateName: tmpl.name,
                    templateCategory: tmpl.goal,
                    oggetto: tmpl.defaultOggetto || '',
                    body: tmpl.defaultBody || '',
                    emailStyle: style,
                  }));
                }}
              />
              {form.templateId && (
                <div style={{ marginTop: 20 }}>
                  <button onClick={() => setStep(2)} style={{
                    width: '100%', background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
                    border: 'none', borderRadius: 10, padding: '12px 0',
                    color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Continua → Contenuto
                  </button>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <StepContent
              form={form}
              setField={setField}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepAudience
              form={form}
              setField={setField}
              validContacts={validContacts}
              allContacts={emailContacts}
              getAudienceCount={getAudienceCount}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepSchedule
              form={form}
              setField={setField}
              audienceCount={getAudienceCount()}
              onBack={() => setStep(3)}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}