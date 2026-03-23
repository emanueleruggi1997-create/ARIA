import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AriaRobot from './AriaRobot';

const COLORS = [
  { id: '#3B6EF8', label: 'Blu' },
  { id: '#10B981', label: 'Verde' },
  { id: '#7C3AED', label: 'Viola' },
  { id: '#EC4899', label: 'Rosa' },
  { id: '#F59E0B', label: 'Arancio' },
  { id: '#14B8A6', label: 'Teal' },
];

const TONI = [
  { id: 'amichevole', emoji: '😊', label: 'Amichevole', desc: 'Caldo, vicino, usa il tu' },
  { id: 'professionale', emoji: '💼', label: 'Professionale', desc: 'Formale, preciso, usa il lei' },
  { id: 'diretto', emoji: '⚡', label: 'Diretto', desc: 'Breve, concreto, va al punto' },
];

const MOODS = [
  { id: 'felice',     emoji: '😊', label: 'Felice',     desc: 'Galleggia piano, cuoricini' },
  { id: 'divertito',  emoji: '😂', label: 'Divertito',  desc: 'Oscillazione, stelle' },
  { id: 'triste',     emoji: '😢', label: 'Triste',     desc: 'Lento, lacrime' },
  { id: 'arrabbiato', emoji: '😠', label: 'Arrabbiato', desc: 'Vibra, fiamme' },
  { id: 'eccitato',   emoji: '🤩', label: 'Eccitato',   desc: 'Salti, coriandoli' },
  { id: 'stanco',     emoji: '😴', label: 'Stanco',     desc: 'Dondola, ZZZ' },
  { id: 'innamorato', emoji: '🥰', label: 'Innamorato', desc: 'Trema di gioia, cuori' },
  { id: 'energico',   emoji: '⚡', label: 'Energico',   desc: 'Rimbalza, fulmini' },
];

export default function AriaChiSono({ form, updateField, ariaName, ariaColor, onSave, saving }) {
  const currentMood = form.robot_mood || form.aria_mood || 'felice';

  return (
    <div className="space-y-6">

      {/* 1 — Preview robot animato + info */}
      <div
        className="flex items-center gap-5 p-5 rounded-2xl border"
        style={{ background: `${ariaColor}0D`, borderColor: `${ariaColor}33` }}
      >
        <div className="shrink-0">
          <AriaRobot color={ariaColor} mood={currentMood} width={80} height={105} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground transition-all">{ariaName}</p>
          <p className="text-sm text-muted-foreground">{form.ruolo_agente || 'Assistente personale'}</p>
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

      {/* 3+4 — Form personalizzazione */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-6">
        <h2 className="text-base font-semibold text-foreground">Personalizza {ariaName}</h2>

        {/* Nome */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
          <Input
            value={form.nome_agente}
            onChange={e => updateField('nome_agente', e.target.value)}
            placeholder="Es. ARIA, MAX, SOFIA"
            maxLength={12}
            className="mt-2 bg-secondary border-border text-base"
          />
        </div>

        {/* Ruolo */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ruolo</Label>
          <Input
            value={form.ruolo_agente}
            onChange={e => updateField('ruolo_agente', e.target.value)}
            placeholder="Es. Assistente commerciale"
            className="mt-2 bg-secondary border-border"
          />
        </div>

        {/* Tono */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Tono di voce</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONI.map(t => (
              <button
                key={t.id}
                onClick={() => updateField('tono', t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center cursor-pointer",
                  form.tono === t.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lingua */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lingua</Label>
          <Select value={form.lingua} onValueChange={v => updateField('lingua', v)}>
            <SelectTrigger className="mt-2 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Italiano', 'English', 'Español', 'Français', 'Deutsch'].map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Colore */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Colore di {ariaName}</Label>
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

        {/* Umore — griglia 4x2 */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Umore di {ariaName}</Label>
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
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: active ? 'scale(1.02)' : 'scale(1)',
                    minHeight: 90,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
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

      {/* Pulsante salva */}
      <Button
        onClick={onSave}
        disabled={saving}
        className="w-full font-semibold text-white"
        style={{ background: ariaColor, minHeight: 48, borderRadius: 12, fontSize: 15 }}
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salva e Aggiorna {ariaName}
      </Button>
    </div>
  );
}