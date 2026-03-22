import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useBusiness } from '@/lib/useBusinessContext';
import { cn } from '@/lib/utils';

const steps = ['Business', 'Canali', 'Configurazione'];

export default function Onboarding() {
  const { setBusiness } = useBusiness();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    settore: '',
    piano: 'starter',
    wa_number: '',
    ig_username: '',
    tono: 'professionale',
    servizi: '',
    attivo: true,
    stato_agente: 'attivo',
    auto_risposta: true,
    orario_inizio: '08:00',
    orario_fine: '20:00',
    giorni_attivi: ['lun', 'mar', 'mer', 'gio', 'ven'],
    fuori_orario_attivo: true,
    messaggio_fuori_orario: 'Grazie per il tuo messaggio! Siamo fuori orario, ti risponderemo domani mattina.'
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    const created = await base44.entities.Business.create(form);
    setBusiness(created);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Emaral Agent AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Configura il tuo business per iniziare</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-12 h-0.5", i < step ? "bg-primary" : "bg-secondary")} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Informazioni Business</h2>
              <div>
                <Label>Nome Business *</Label>
                <Input value={form.nome} onChange={e => updateField('nome', e.target.value)} placeholder="Es. Studio Web Roma" className="mt-1.5 bg-secondary border-border" />
              </div>
              <div>
                <Label>Settore</Label>
                <Input value={form.settore} onChange={e => updateField('settore', e.target.value)} placeholder="Es. Agenzia Web, Ristorante..." className="mt-1.5 bg-secondary border-border" />
              </div>
              <div>
                <Label>Piano</Label>
                <Select value={form.piano} onValueChange={v => updateField('piano', v)}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter — 99€/mese</SelectItem>
                    <SelectItem value="pro">Pro — 199€/mese</SelectItem>
                    <SelectItem value="agency">Agency — 399€/mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Canali di comunicazione</h2>
              <div>
                <Label>Numero WhatsApp</Label>
                <Input value={form.wa_number} onChange={e => updateField('wa_number', e.target.value)} placeholder="+39 333 1234567" className="mt-1.5 bg-secondary border-border" />
              </div>
              <div>
                <Label>Username Instagram</Label>
                <Input value={form.ig_username} onChange={e => updateField('ig_username', e.target.value)} placeholder="@tuobusiness" className="mt-1.5 bg-secondary border-border" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Configurazione Agente</h2>
              <div>
                <Label>Tono dell'agente</Label>
                <Select value={form.tono} onValueChange={v => updateField('tono', v)}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formale">Formale</SelectItem>
                    <SelectItem value="professionale">Professionale</SelectItem>
                    <SelectItem value="amichevole">Amichevole</SelectItem>
                    <SelectItem value="diretto">Diretto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrivi i tuoi servizi</Label>
                <Textarea value={form.servizi} onChange={e => updateField('servizi', e.target.value)} placeholder="Es. Creo siti web, app mobile, sistemi AI. Prezzi da 500€ a 5.000€..." className="mt-1.5 bg-secondary border-border h-24" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !form.nome}>
                Avanti <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creazione...' : 'Crea Business'} <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Powered by Emaral Group — emaralgroup.com</p>
      </div>
    </div>
  );
}