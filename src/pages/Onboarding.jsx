import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Bot, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Loader2, Wifi, ExternalLink } from 'lucide-react';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

const STEPS = ['Attività', 'WhatsApp', 'Instagram', 'Agente'];

export default function Onboarding() {
  const { setBusiness } = useBusiness();
  const [step, setStep] = useState(-1); // -1 = welcome screen
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [waTestStatus, setWaTestStatus] = useState(null);
  const [igConnected, setIgConnected] = useState(false);
  const [igModal, setIgModal] = useState(false);
  const [testingWa, setTestingWa] = useState(false);

  const [form, setForm] = useState({
    nome: '', settore: '', servizi: '',
    wa_number: '', wa_api_key: '',
    ig_username: '', ig_dm_attivo: true, ig_autopublish: false,
    nome_agente: '', tono: 'professionale',
    cose_da_non_fare: '', orario_inizio: '09:00', orario_fine: '18:00',
    piano: 'starter', attivo: true, stato_agente: 'attivo',
    auto_risposta: true, giorni_attivi: ['lun','mar','mer','gio','ven'],
    fuori_orario_attivo: true,
    messaggio_fuori_orario: 'Grazie! Siamo fuori orario, ti risponderemo presto.'
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const testWa = async () => {
    setTestingWa(true);
    await new Promise(r => setTimeout(r, 1800));
    setWaTestStatus(form.wa_number ? 'ok' : 'err');
    setTestingWa(false);
  };

  const connectIg = async () => {
    setIgModal(true);
    await new Promise(r => setTimeout(r, 1200));
    setIgConnected(true);
    if (!form.ig_username) set('ig_username', 'mio.business');
  };

  const handleSubmit = async () => {
    if (saving) return; // prevent double-submit on fast clicks
    if (!form.nome?.trim()) return;
    setSaving(true);
    try {
      const data = {
        nome: form.nome.trim(), settore: form.settore, servizi: form.servizi,
        wa_number: form.wa_number, ig_username: form.ig_username,
        nome_agente: form.nome_agente || 'ARIA', tono: form.tono,
        cose_da_non_fare: form.cose_da_non_fare,
        orario_inizio: form.orario_inizio, orario_fine: form.orario_fine,
        piano: form.piano, attivo: true, stato_agente: 'attivo',
        auto_risposta: true, giorni_attivi: form.giorni_attivi,
        fuori_orario_attivo: form.fuori_orario_attivo,
        messaggio_fuori_orario: form.messaggio_fuori_orario,
      };
      const created = await base44.entities.Business.create(data);
      setBusiness(created);
      setDone(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 300);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 500);
    } catch (err) {
      console.error('[Onboarding] handleSubmit error:', err);
      setSaving(false); // re-enable button on error
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Il tuo agente è attivo! 🚀</h1>
          <p className="text-muted-foreground">Stai per entrare nella dashboard...</p>
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
            <Bot className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Benvenuto in<br /><span className="text-primary">Emaral Agent AI</span></h1>
            <p className="text-muted-foreground mt-3 text-lg">Configura la tua attività in 5 minuti</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {['🤖 Agente AI', '📱 WhatsApp', '📸 Instagram'].map(f => (
              <div key={f} className="bg-card border border-border rounded-xl p-3">
                <p className="text-sm font-medium text-foreground">{f}</p>
              </div>
            ))}
          </div>
          <Button size="lg" className="w-full text-lg h-12" onClick={() => setStep(0)}>
            Inizia configurazione <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground">Powered by Emaral Group</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                  i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("w-10 h-0.5 mb-4", i < step ? "bg-green-500" : "bg-secondary")} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          {/* Step 0 - Attività */}
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">La tua attività</h2>
              <div>
                <Label>Nome attività *</Label>
                <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Es. Studio Web Roma" className="mt-1.5 bg-secondary border-border" />
              </div>
              <div>
                <Label>Settore</Label>
                <Select value={form.settore} onValueChange={v => set('settore', v)}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    {['Ristorante', 'Negozio', 'Studio professionale', 'E-commerce', 'Agenzia Web', 'Altro'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrizione servizi</Label>
                <Textarea value={form.servizi} onChange={e => set('servizi', e.target.value)} placeholder="Descrivi cosa fai, i tuoi servizi principali e i prezzi..." className="mt-1.5 bg-secondary border-border h-24" />
              </div>
            </>
          )}

          {/* Step 1 - WhatsApp */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Collega WhatsApp Business</h2>
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground mb-3">Come configurare:</p>
                {['Vai su 360dialog.com e crea un account', 'Verifica il tuo numero WhatsApp Business', 'Copia la tua API Key', 'Incollala qui sotto'].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
              <div>
                <Label>WhatsApp API Key</Label>
                <div className="relative mt-1.5">
                  <Input type={showApiKey ? 'text' : 'password'} value={form.wa_api_key} onChange={e => set('wa_api_key', e.target.value)} placeholder="sk-..." className="bg-secondary border-border pr-10" />
                  <button className="absolute right-3 top-2 text-muted-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Numero WhatsApp Business</Label>
                <Input value={form.wa_number} onChange={e => set('wa_number', e.target.value)} placeholder="+39 333 1234567" className="mt-1.5 bg-secondary border-border" />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={testWa} disabled={testingWa}>
                  {testingWa ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                  Testa connessione
                </Button>
                {waTestStatus === 'ok' && <span className="text-green-400 text-sm font-medium">CONNESSO ✅</span>}
                {waTestStatus === 'err' && <span className="text-red-400 text-sm font-medium">ERRORE ❌</span>}
              </div>
              <a href="https://360dialog.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Non hai 360dialog? Clicca qui
              </a>
            </>
          )}

          {/* Step 2 - Instagram */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Collega Instagram Business</h2>
              {igConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-400">Account collegato ✅</p>
                      <p className="text-xs text-muted-foreground">@{form.ig_username}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Username Instagram</Label>
                    <Input value={form.ig_username} onChange={e => set('ig_username', e.target.value)} className="mt-1.5 bg-secondary border-border" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Ricevi DM Instagram</p><p className="text-xs text-muted-foreground">L'agente risponde ai messaggi diretti</p></div>
                    <Switch checked={form.ig_dm_attivo} onCheckedChange={v => set('ig_dm_attivo', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Pubblica post automatici</p><p className="text-xs text-muted-foreground">Gestione contenuti automatica</p></div>
                    <Switch checked={form.ig_autopublish} onCheckedChange={v => set('ig_autopublish', v)} />
                  </div>
                </div>
              ) : igModal ? (
                <div className="p-4 bg-secondary rounded-xl text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">Connessione in corso...</p>
                </div>
              ) : (
                <button
                  onClick={connectIg}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg"
                  style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                >
                  📸 Connetti con Instagram
                </button>
              )}
            </div>
          )}

          {/* Step 3 - Agente */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold">Configura il tuo Agente AI</h2>
              <div>
                <Label>Nome agente</Label>
                <Input value={form.nome_agente} onChange={e => set('nome_agente', e.target.value)} placeholder='Es. "Sofia"' className="mt-1.5 bg-secondary border-border" />
              </div>
              <div>
                <Label>Tono di comunicazione</Label>
                <div className="flex gap-2 mt-1.5">
                  {['formale', 'amichevole', 'diretto'].map(t => (
                    <button key={t} onClick={() => set('tono', t)}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize",
                        form.tono === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Cosa NON deve mai dire l'agente?</Label>
                <Textarea value={form.cose_da_non_fare} onChange={e => set('cose_da_non_fare', e.target.value)} placeholder="Es. Non dare prezzi esatti, non parlare della concorrenza..." className="mt-1.5 bg-secondary border-border h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dalle</Label><Input type="time" value={form.orario_inizio} onChange={e => set('orario_inizio', e.target.value)} className="mt-1.5 bg-secondary border-border" /></div>
                <div><Label>Alle</Label><Input type="time" value={form.orario_fine} onChange={e => set('orario_fine', e.target.value)} className="mt-1.5 bg-secondary border-border" /></div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => step === 0 ? setStep(-1) : setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !form.nome}>
                Avanti <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <span>🚀</span>}
                Attiva il mio Agente
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}