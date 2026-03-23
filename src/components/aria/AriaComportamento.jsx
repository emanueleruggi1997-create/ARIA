import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const GIORNI = [
  { id: 'lun', label: 'L' },
  { id: 'mar', label: 'M' },
  { id: 'mer', label: 'M' },
  { id: 'gio', label: 'G' },
  { id: 'ven', label: 'V' },
  { id: 'sab', label: 'S' },
  { id: 'dom', label: 'D' },
];

const ESCALATION_ITEMS = [
  { id: 'arrabbiato', label: 'Quando il cliente è arrabbiato' },
  { id: 'prezzo', label: 'Quando chiedono il prezzo esatto' },
  { id: 'non-sa', label: 'Quando non sa rispondere' },
  { id: 'timeout', label: 'Dopo 5 messaggi senza risposta' },
];

export default function AriaComportamento({ form, updateField, ariaColor }) {
  const toggleGiorno = (g) => {
    const updated = form.giorni_attivi.includes(g)
      ? form.giorni_attivi.filter(d => d !== g)
      : [...form.giorni_attivi, g];
    updateField('giorni_attivi', updated);
  };

  const toggleEscalation = (id) => {
    const rules = form.escalation_rules || [];
    const updated = rules.includes(id)
      ? rules.filter(r => r !== id)
      : [...rules, id];
    updateField('escalation_rules', updated);
  };

  return (
    <div className="space-y-5">
      {/* Orari */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <h2 className="text-base font-semibold text-foreground">🕐 Quando risponde</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">ARIA risponde automaticamente</p>
            <p className="text-xs text-muted-foreground mt-0.5">Attiva per far rispondere ARIA da sola</p>
          </div>
          <Switch checked={form.auto_risposta} onCheckedChange={v => updateField('auto_risposta', v)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dalle</Label>
            <Input
              type="time"
              value={form.orario_inizio}
              onChange={e => updateField('orario_inizio', e.target.value)}
              className="mt-2 bg-secondary border-border"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alle</Label>
            <Input
              type="time"
              value={form.orario_fine}
              onChange={e => updateField('orario_fine', e.target.value)}
              className="mt-2 bg-secondary border-border"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Giorni attivi</Label>
          <div className="flex gap-2">
            {GIORNI.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGiorno(g.id)}
                className={cn(
                  "w-9 h-9 rounded-full text-xs font-bold transition-all",
                  form.giorni_attivi.includes(g.id)
                    ? 'text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
                style={form.giorni_attivi.includes(g.id) ? { background: ariaColor } : {}}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Messaggio fuori orario</p>
            <Switch checked={form.fuori_orario_attivo} onCheckedChange={v => updateField('fuori_orario_attivo', v)} />
          </div>
          {form.fuori_orario_attivo && (
            <Textarea
              value={form.messaggio_fuori_orario}
              onChange={e => updateField('messaggio_fuori_orario', e.target.value)}
              placeholder="Ciao! Siamo fuori orario. Ti rispondo domani dalle 8:00. A presto!"
              className="bg-secondary border-border h-16 resize-none"
            />
          )}
        </div>
      </div>

      {/* Escalation */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">📞 Quando ARIA ti chiama in causa</h2>
        <p className="text-xs text-muted-foreground">In questi casi ARIA si ferma e ti avvisa</p>

        <div className="space-y-3">
          {ESCALATION_ITEMS.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm text-foreground">{item.label}</span>
              <Switch
                checked={(form.escalation_rules || []).includes(item.id)}
                onCheckedChange={() => toggleEscalation(item.id)}
              />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mandami una notifica su:</Label>
          <Input
            value={form.email_notifica}
            onChange={e => updateField('email_notifica', e.target.value)}
            placeholder="email@esempio.com"
            className="mt-2 bg-secondary border-border"
          />
        </div>
      </div>
    </div>
  );
}