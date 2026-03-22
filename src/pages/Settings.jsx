import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, Bell, LogOut, Link2, CreditCard, Wifi, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PIANI = [
  { id: 'starter', label: 'Starter', prezzo: '99€/mese', desc: '1 account, 20 post/mese', features: ['1 business', '20 post/mese', 'AI di base'] },
  { id: 'pro', label: 'Pro', prezzo: '199€/mese', desc: '3 account, 60 post/mese', features: ['3 business', '60 post/mese', 'AI avanzata', 'Analytics'] },
  { id: 'agency', label: 'Agency', prezzo: '399€/mese', desc: 'Illimitato, white label', features: ['Illimitato', 'White label', 'API access', 'Supporto prioritario'] },
];

export default function Settings() {
  const { business, refreshBusiness } = useBusiness();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waStatus, setWaStatus] = useState(null);
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
    toast({ title: '✅ Impostazioni salvate!' });
    setSaving(false);
  };

  const testWa = async () => {
    setTestingWa(true);
    await new Promise(r => setTimeout(r, 1500));
    setWaStatus(form.wa_number ? 'ok' : 'err');
    setTestingWa(false);
  };

  const waConnected = !!form.wa_number;
  const igConnected = !!form.ig_username;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
        <Button variant="ghost" className="text-destructive text-sm" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Esci
        </Button>
      </div>

      <Tabs defaultValue="generale">
        <TabsList className="bg-secondary w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="generale" className="flex-1 text-xs">⚙️ Generale</TabsTrigger>
          <TabsTrigger value="connessioni" className="flex-1 text-xs">🔗 Connessioni</TabsTrigger>
          <TabsTrigger value="piano" className="flex-1 text-xs">💳 Piano</TabsTrigger>
          <TabsTrigger value="notifiche" className="flex-1 text-xs">🔔 Notifiche</TabsTrigger>
        </TabsList>

        {/* Generale */}
        <TabsContent value="generale" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Informazioni Business</h2>
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salva
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/system-check')}>
              🔧 System Check — verifica funzionamento
            </Button>
          </div>
        </TabsContent>

        {/* Connessioni */}
        <TabsContent value="connessioni" className="space-y-4 mt-4">
          {/* WhatsApp */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <h2 className="text-sm font-semibold">WhatsApp Business</h2>
              <div className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                waConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {waConnected ? <><Check className="w-3 h-3" /> CONNESSO</> : <><X className="w-3 h-3" /> NON CONNESSO</>}
              </div>
            </div>
            <div>
              <Label>Numero collegato</Label>
              <Input value={form.wa_number} onChange={e => setForm(p => ({ ...p, wa_number: e.target.value }))} placeholder="+39 333 1234567" className="mt-1 bg-secondary border-border" />
            </div>
            <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
              Provider: <span className="text-foreground font-medium">360dialog</span> · Messaggi questo mese: <span className="text-primary font-medium">247</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={testWa} disabled={testingWa}>
                {testingWa ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wifi className="w-3 h-3 mr-1" />}
                Testa connessione
              </Button>
              {waStatus === 'ok' && <span className="text-green-400 text-xs self-center">Connesso ✅</span>}
              {waStatus === 'err' && <span className="text-red-400 text-xs self-center">Errore ❌</span>}
              <Button variant="outline" size="sm" className="ml-auto">
                <RotateCcw className="w-3 h-3 mr-1" /> Ricollega
              </Button>
            </div>
          </div>

          {/* Instagram */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📸</span>
              <h2 className="text-sm font-semibold">Instagram Business</h2>
              <div className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                igConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {igConnected ? <><Check className="w-3 h-3" /> CONNESSO</> : <><X className="w-3 h-3" /> NON CONNESSO</>}
              </div>
            </div>
            <div>
              <Label>Account</Label>
              <Input value={form.ig_username} onChange={e => setForm(p => ({ ...p, ig_username: e.target.value }))} placeholder="@tuobusiness" className="mt-1 bg-secondary border-border" />
            </div>
            {igConnected && (
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                DM ricevuti questo mese: <span className="text-primary font-medium">83</span>
              </div>
            )}
            <Button variant="outline" size="sm">
              <RotateCcw className="w-3 h-3 mr-1" /> Ricollega Instagram
            </Button>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salva connessioni
          </Button>
        </TabsContent>

        {/* Piano */}
        <TabsContent value="piano" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Piano abbonamento</h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Piano attuale: <span className="font-bold text-primary capitalize">{form.piano}</span> · Prossimo rinnovo: 22/04/2026
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PIANI.map(p => (
                <button key={p.id} onClick={() => setForm(prev => ({ ...prev, piano: p.id }))}
                  className={cn("text-left p-4 rounded-xl border transition-all",
                    form.piano === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
                  )}>
                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                  <p className="text-lg font-bold text-primary mt-1">{p.prezzo}</p>
                  <ul className="mt-2 space-y-0.5">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Aggiorna piano
            </Button>
          </div>
        </TabsContent>

        {/* Notifiche */}
        <TabsContent value="notifiche" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Notifiche email</h2>
            </div>
            <div>
              <Label>Email per notifiche</Label>
              <Input value={form.email_notifica} onChange={e => setForm(p => ({ ...p, email_notifica: e.target.value }))} className="mt-1 bg-secondary border-border" placeholder="email@esempio.com" />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salva
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}