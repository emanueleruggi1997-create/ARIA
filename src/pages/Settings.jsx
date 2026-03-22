import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, CreditCard, Bell, Link2, LogOut } from 'lucide-react';

const piani = [
  { id: 'starter', label: 'Starter', prezzo: '99€/mese', desc: '1 account, 20 post/mese' },
  { id: 'pro', label: 'Pro', prezzo: '199€/mese', desc: '3 account, 60 post/mese' },
  { id: 'agency', label: 'Agency', prezzo: '399€/mese', desc: 'Illimitato, white label' },
];

export default function Settings() {
  const { business, refreshBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', settore: '', piano: 'starter', wa_number: '', ig_username: '', email_notifica: ''
  });

  useEffect(() => {
    if (business) {
      setForm({
        nome: business.nome || '',
        settore: business.settore || '',
        piano: business.piano || 'starter',
        wa_number: business.wa_number || '',
        ig_username: business.ig_username || '',
        email_notifica: business.email_notifica || '',
      });
    }
  }, [business]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Business.update(business.id, form);
    await refreshBusiness();
    toast({ title: 'Impostazioni salvate!' });
    setSaving(false);
  };

  const currentPlan = piani.find(p => p.id === form.piano);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>

      {/* Business info */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Informazioni Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome Business</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label>Settore</Label>
            <Input value={form.settore} onChange={e => setForm(p => ({ ...p, settore: e.target.value }))} className="mt-1 bg-secondary border-border" />
          </div>
        </div>
      </section>

      {/* Piano */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Piano abbonamento</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {piani.map(p => (
            <button
              key={p.id}
              onClick={() => setForm(prev => ({ ...prev, piano: p.id }))}
              className={`text-left p-4 rounded-xl border transition-all ${
                form.piano === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{p.label}</p>
              <p className="text-lg font-bold text-primary mt-1">{p.prezzo}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Connessioni */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Connessioni</h2>
        </div>
        <div>
          <Label>Numero WhatsApp</Label>
          <Input value={form.wa_number} onChange={e => setForm(p => ({ ...p, wa_number: e.target.value }))} className="mt-1 bg-secondary border-border" />
        </div>
        <div>
          <Label>Username Instagram</Label>
          <Input value={form.ig_username} onChange={e => setForm(p => ({ ...p, ig_username: e.target.value }))} className="mt-1 bg-secondary border-border" />
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Gestione pagamenti</p>
            </div>
            <Button variant="outline" size="sm" disabled>Connetti</Button>
          </div>
        </div>
      </section>

      {/* Notifiche */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Notifiche</h2>
        </div>
        <div>
          <Label>Email per notifiche</Label>
          <Input value={form.email_notifica} onChange={e => setForm(p => ({ ...p, email_notifica: e.target.value }))} className="mt-1 bg-secondary border-border" placeholder="email@esempio.com" />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-destructive" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Esci
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salva impostazioni
        </Button>
      </div>
    </div>
  );
}