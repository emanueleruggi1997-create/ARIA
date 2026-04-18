import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AriaRobot from './AriaRobot';
import { useLang } from '@/lib/LanguageContext.jsx';

const COLORS = [
  { id: '#3B6EF8', label: 'Blue' },
  { id: '#10B981', label: 'Green' },
  { id: '#7C3AED', label: 'Purple' },
  { id: '#EC4899', label: 'Pink' },
  { id: '#F59E0B', label: 'Orange' },
  { id: '#14B8A6', label: 'Teal' },
];

export default function AriaChiSono({ form, updateField, ariaName, ariaColor, onSave, saving }) {
  const { t, lang } = useLang();
  const currentMood = form.robot_mood || form.aria_mood || 'felice';

  const TONI = [
    { id: 'amichevole', emoji: '😊', label: t.toneAmichevole, desc: t.toneAmichevoleDesc },
    { id: 'professionale', emoji: '💼', label: t.toneProfessionale, desc: t.toneProfessionaleDesc },
    { id: 'diretto', emoji: '⚡', label: t.toneDiretto, desc: t.toneDirettoDesc },
  ];

  const MOODS = [
    { id: 'felice',     emoji: '😊', label: t.moodFelice,     desc: t.moodFeliceDesc },
    { id: 'divertito',  emoji: '😂', label: t.moodDivertito,  desc: t.moodDivertitoDesc },
    { id: 'triste',     emoji: '😢', label: t.moodTriste,     desc: t.moodTristeDesc },
    { id: 'arrabbiato', emoji: '😠', label: t.moodArrabbiato, desc: t.moodArraббiatoDesc },
    { id: 'eccitato',   emoji: '🤩', label: t.moodEccitato,   desc: t.moodEccitatoDesc },
    { id: 'stanco',     emoji: '😴', label: t.moodStanco,     desc: t.moodStancoDesc },
    { id: 'innamorato', emoji: '🥰', label: t.moodInnamorato, desc: t.moodInnamoratoDesc },
    { id: 'energico',   emoji: '⚡', label: t.moodEnergetico, desc: t.moodEnergeticoDesc },
  ];

  return (
    <div className="space-y-6">
      {/* Preview robot */}
      <div
        className="flex items-center gap-5 p-5 rounded-2xl border"
        style={{ background: `${ariaColor}0D`, borderColor: `${ariaColor}33` }}
      >
        <div className="shrink-0">
          <AriaRobot color={ariaColor} mood={currentMood} width={80} height={105} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{ariaName}</p>
          <p className="text-sm text-muted-foreground">{form.ruolo_agente || (lang === 'en' ? 'Personal assistant' : 'Assistente personale')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${ariaColor}20`, color: ariaColor }}>
              {TONI.find(t => t.id === form.tono)?.emoji} {TONI.find(t => t.id === form.tono)?.label}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-secondary text-muted-foreground">
              {MOODS.find(m => m.id === currentMood)?.emoji} {MOODS.find(m => m.id === currentMood)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-6">
        <h2 className="text-base font-semibold text-foreground">{t.customizeAgent} {ariaName}</h2>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.agentName}</Label>
          <Input
            value={form.nome_agente}
            onChange={e => updateField('nome_agente', e.target.value)}
            placeholder="Es. ARIA, MAX, SOFIA"
            maxLength={12}
            className="mt-2 bg-secondary border-border text-base"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.agentRole}</Label>
          <Input
            value={form.ruolo_agente}
            onChange={e => updateField('ruolo_agente', e.target.value)}
            placeholder={t.agentRolePlaceholder}
            className="mt-2 bg-secondary border-border"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">{t.agentTone}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONI.map(tone => (
              <button
                key={tone.id}
                onClick={() => updateField('tono', tone.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center cursor-pointer",
                  form.tono === tone.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{tone.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{tone.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{tone.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.agentLanguage}</Label>
          <Select value={form.lingua} onValueChange={v => updateField('lingua', v)}>
            <SelectTrigger className="mt-2 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Italiano', 'English', 'Español', 'Français', 'Deutsch'].map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">{t.agentColor} {ariaName}</Label>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => updateField('avatar_agente', c.id)}
                title={c.label}
                className="w-10 h-10 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: c.id,
                  border: form.avatar_agente === c.id ? '3px solid white' : '3px solid transparent',
                  boxShadow: form.avatar_agente === c.id ? `0 0 14px ${c.id}99` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">{t.agentMood} {ariaName}</Label>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(m => {
              const active = currentMood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => updateField('robot_mood', m.id)}
                  style={{
                    background: active ? `${ariaColor}18` : '#0F1219',
                    border: active ? `1.5px solid ${ariaColor}` : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: 12, cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: active ? 'scale(1.02)' : 'scale(1)',
                    minHeight: 90, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}}
                >
                  <span style={{ fontSize: 32, lineHeight: 1 }}>{m.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? ariaColor : '#F0F4FF', marginTop: 4 }}>{m.label}</span>
                  <span style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={saving}
        className="w-full font-semibold text-white"
        style={{ background: ariaColor, minHeight: 48, borderRadius: 12, fontSize: 15 }}
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        {t.saveAndUpdate} {ariaName}
      </Button>
    </div>
  );
}