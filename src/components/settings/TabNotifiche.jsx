import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Bell } from 'lucide-react';

const toggleItems = [
  { key: 'notif_escalation', label: 'Notifica quando ARIA scala un messaggio all\'umano' },
  { key: 'notif_report_settimanale', label: 'Report settimanale via email' },
  { key: 'notif_limite_piano', label: 'Avviso limite piano vicino (90%)' },
];

export default function TabNotifiche({ form, setForm, saving, onSave }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Notifiche email</h2>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Email per notifiche</Label>
          <Input
            value={form.email_notifica || ''}
            onChange={e => setForm(p => ({ ...p, email_notifica: e.target.value }))}
            placeholder="email@esempio.com"
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          {toggleItems.map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-foreground leading-snug">{item.label}</span>
              <Switch
                checked={!!form[item.key]}
                onCheckedChange={v => setForm(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full" style={{ minHeight: 44, borderRadius: 10, fontWeight: 600 }}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salva notifiche
        </Button>
      </div>
    </div>
  );
}