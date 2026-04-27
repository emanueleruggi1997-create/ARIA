import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext.jsx';

const GIORNI_IT = [
  { id: 'lun', label: 'L' }, { id: 'mar', label: 'M' }, { id: 'mer', label: 'M' },
  { id: 'gio', label: 'G' }, { id: 'ven', label: 'V' }, { id: 'sab', label: 'S' }, { id: 'dom', label: 'D' },
];
const GIORNI_EN = [
  { id: 'lun', label: 'M' }, { id: 'mar', label: 'T' }, { id: 'mer', label: 'W' },
  { id: 'gio', label: 'T' }, { id: 'ven', label: 'F' }, { id: 'sab', label: 'S' }, { id: 'dom', label: 'S' },
];

export default function AriaComportamento({ form, updateField, ariaColor }) {
  const { t, lang } = useLang();
  const GIORNI = lang === 'en' ? GIORNI_EN : GIORNI_IT;

  const is24h = form.orario_inizio === '00:00' && (form.orario_fine === '23:59' || form.orario_fine === '00:00');

  const ESCALATION_ITEMS = [
    { id: 'arrabbiato', label: t.escalationAngry },
    { id: 'prezzo', label: t.escalationPrice },
    { id: 'non-sa', label: t.escalationDontKnow },
    { id: 'timeout', label: t.escalationTimeout },
  ];

  const toggleGiorno = (g) => {
    const updated = form.giorni_attivi.includes(g)
      ? form.giorni_attivi.filter(d => d !== g)
      : [...form.giorni_attivi, g];
    updateField('giorni_attivi', updated);
  };

  const toggle24h = (v) => {
    if (v) {
      updateField('orario_inizio', '00:00');
      updateField('orario_fine', '23:59');
      updateField('giorni_attivi', ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']);
    } else {
      updateField('orario_inizio', '08:00');
      updateField('orario_fine', '20:00');
    }
  };

  const toggleEscalation = (id) => {
    const rules = form.escalation_rules || [];
    const updated = rules.includes(id) ? rules.filter(r => r !== id) : [...rules, id];
    updateField('escalation_rules', updated);
  };

  return (
    <div className="space-y-5">
      {/* Orari ARIA */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">🤖 {t.ariaReplyTimes}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t.ariaReplyTimesDesc}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t.ariaAutoReply}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.ariaAutoReplyDesc}</p>
          </div>
          <Switch checked={form.auto_risposta} onCheckedChange={v => updateField('auto_risposta', v)} />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div>
            <p className="text-sm font-medium text-foreground">💬 {t.ariaAutoComments}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.ariaAutoCommentsDesc}</p>
          </div>
          <Switch checked={!!form.auto_commenti} onCheckedChange={v => updateField('auto_commenti', v)} />
        </div>

        {/* Toggle 24h — semplice e diretto */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div>
            <p className="text-sm font-bold text-foreground">⚡ Sempre disponibile 24h</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {is24h ? 'ARIA risponde sempre, senza limiti di orario' : 'Attivo solo negli orari impostati'}
            </p>
          </div>
          <Switch checked={is24h} onCheckedChange={toggle24h} />
        </div>

        {/* Orari personalizzati — visibili solo se NON 24h */}
        {!is24h && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.from}</Label>
                <Input type="time" value={form.orario_inizio} onChange={e => updateField('orario_inizio', e.target.value)} className="mt-2 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.to}</Label>
                <Input type="time" value={form.orario_fine} onChange={e => updateField('orario_fine', e.target.value)} className="mt-2 bg-secondary border-border" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">{t.activeDays}</Label>
              <div className="flex gap-2">
                {GIORNI.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGiorno(g.id)}
                    className={cn(
                      "w-9 h-9 rounded-full text-xs font-bold transition-all",
                      form.giorni_attivi.includes(g.id) ? 'text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
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
                <p className="text-sm font-medium text-foreground">{t.outOfHoursMsg}</p>
                <Switch checked={form.fuori_orario_attivo} onCheckedChange={v => updateField('fuori_orario_attivo', v)} />
              </div>
              {form.fuori_orario_attivo && (
                <Textarea
                  value={form.messaggio_fuori_orario}
                  onChange={e => updateField('messaggio_fuori_orario', e.target.value)}
                  placeholder={t.outOfHoursMsgPlaceholder}
                  className="bg-secondary border-border h-16 resize-none"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Escalation */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">📞 {t.escalationTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.escalationDesc}</p>

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
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.escalationNotifyOn}</Label>
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