import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

export default function AriaChiSono({ form, updateField, ariaName, ariaColor }) {
  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border"
        style={{ background: `${ariaColor}0D`, borderColor: `${ariaColor}33` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 transition-all duration-300"
          style={{ background: ariaColor, boxShadow: `0 0 16px ${ariaColor}44` }}
        >
          {ariaName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-foreground text-lg transition-all duration-300">{ariaName}</p>
          <p className="text-sm text-muted-foreground">{form.ruolo_agente || 'Assistente personale'}</p>
          <p className="text-xs mt-1" style={{ color: ariaColor }}>
            {TONI.find(t => t.id === form.tono)?.emoji} {TONI.find(t => t.id === form.tono)?.desc || ''}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Personalizza {ariaName} come vuoi</h2>

        {/* Name */}
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

        {/* Role */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ruolo</Label>
          <Input
            value={form.ruolo_agente}
            onChange={e => updateField('ruolo_agente', e.target.value)}
            placeholder="Es. Assistente commerciale"
            className="mt-2 bg-secondary border-border"
          />
        </div>

        {/* Tone */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Tono di voce</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONI.map(t => (
              <button
                key={t.id}
                onClick={() => updateField('tono', t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center cursor-pointer",
                  form.tono === t.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
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

        {/* Color */}
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
                  boxShadow: form.avatar_agente === c.id ? `0 0 12px ${c.id}88` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}