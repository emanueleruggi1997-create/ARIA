import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import StepTemplate from './wizard/StepTemplate';
import StepDetails from './wizard/StepDetails';
import StepAudience from './wizard/StepAudience';
import StepEditor from './wizard/StepEditor';
import StepReview from './wizard/StepReview';

const C = {
  bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const STEPS = [
  { n: 1, label: 'Template' },
  { n: 2, label: 'Campagna' },
  { n: 3, label: 'Audience' },
  { n: 4, label: 'Editor' },
  { n: 5, label: 'Review' },
];

const EMPTY_FORM = {
  templateId: null,
  templateName: '',
  templateCategory: '',
  nome: '',
  tipo: 'newsletter',
  mittente_nome: '',
  mittente_email: '',
  oggetto: '',
  preview_text: '',
  destinatari_tag: 'tutti',
  audience_filters: {},
  blocks: [],
  scheduled_at: '',
  stato: 'bozza',
};

export default function CampaignWizard({ businessId, emailContacts, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const setField = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setFields = (obj) => setForm(p => ({ ...p, ...obj }));

  const validContacts = emailContacts.filter(c => c.email?.includes('@') && c.stato === 'attivo');

  const getAudienceCount = () => {
    const tag = form.destinatari_tag;
    if (tag === 'tutti') return validContacts.length;
    return validContacts.filter(c => c.fonte === tag).length;
  };

  const handleSave = async (stato = 'bozza', scheduled_at = '') => {
    setSaving(true);
    try {
      const blocksStr = JSON.stringify(form.blocks);
      await base44.entities.EmailCampaign.create({
        business_id: businessId,
        nome: form.nome,
        oggetto: form.oggetto,
        preview_text: form.preview_text,
        mittente_nome: form.mittente_nome,
        mittente_email: form.mittente_email,
        destinatari_tag: form.destinatari_tag,
        destinatari_count: getAudienceCount(),
        stato,
        scheduled_at: scheduled_at || form.scheduled_at || '',
        template_id: form.templateId || '',
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#000000dd', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 860,
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        maxHeight: '92vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${C.border}`, paddingBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: C.text }}>📧 Nuova Campagna Email</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                  <div style={{ flex: 1, height: 2, background: step > s.n ? C.success : C.border, margin: '0 4px', marginBottom: 18, transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && (
            <StepTemplate
              selected={form.templateId}
              onSelect={(tmpl) => {
                setFields({ templateId: tmpl.id, templateName: tmpl.name, templateCategory: tmpl.category });
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepDetails
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
            <StepEditor
              form={form}
              setField={setField}
              businessId={businessId}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <StepReview
              form={form}
              audienceCount={getAudienceCount()}
              onBack={() => setStep(4)}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}