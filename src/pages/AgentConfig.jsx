import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bot, Save, Loader2, RotateCcw } from 'lucide-react';
import AgentSimulator from '@/components/agent/AgentSimulator';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import debounce from 'lodash/debounce';

const giorni = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const escalationOptions = [
  'Cliente arrabbiato o reclamo',
  'Richiesta prezzo esatto',
  'Richiesta rimborso',
  'Domanda tecnica complessa',
  'Dopo 5 messaggi senza conversione',
];

export default function AgentConfig() {
  const { business, refreshBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [form, setForm] = useState({
    nome_agente: '',
    ruolo_agente: '',
    tono: 'professionale',
    lingua: 'Italiano',
    servizi: '',
    cose_da_non_fare: '',
    faq: '',
    auto_risposta: true,
    orario_inizio: '08:00',
    orario_fine: '20:00',
    giorni_attivi: ['lun', 'mar', 'mer', 'gio', 'ven'],
    fuori_orario_attivo: true,
    messaggio_fuori_orario: '',
    escalation_rules: [],
    email_notifica: '',
    ai_prompt: '',
    stato_agente: 'attivo',
  });

  useEffect(() => {
    if (business) {
      setForm({
        nome_agente: business.nome_agente || '',
        ruolo_agente: business.ruolo_agente || '',
        tono: business.tono || 'professionale',
        lingua: business.lingua || 'Italiano',
        servizi: business.servizi || '',
        cose_da_non_fare: business.cose_da_non_fare || '',
        faq: business.faq || '',
        auto_risposta: business.auto_risposta !== false,
        orario_inizio: business.orario_inizio || '08:00',
        orario_fine: business.orario_fine || '20:00',
        giorni_attivi: business.giorni_attivi || ['lun', 'mar', 'mer', 'gio', 'ven'],
        fuori_orario_attivo: business.fuori_orario_attivo !== false,
        messaggio_fuori_orario: business.messaggio_fuori_orario || '',
        escalation_rules: business.escalation_rules || [],
        email_notifica: business.email_notifica || '',
        ai_prompt: business.ai_prompt || '',
        stato_agente: business.stato_agente || 'attivo',
      });
    }
  }, [business]);

  const autoSave = useCallback(
    debounce(async (data) => {
      if (!business) return;
      await base44.entities.Business.update(business.id, data);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500),
    [business]
  );

  const updateField = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    autoSave(updated);
  };

  const handleSaveAndActivate = async () => {
    setSaving(true);
    await base44.entities.Business.update(business.id, { ...form, stato_agente: 'attivo' });
    await refreshBusiness();
    toast({ title: 'Agente salvato e attivato!' });
    setSaving(false);
  };

  const generatePrompt = () => {
    const prompt = `Sei ${form.nome_agente || 'un assistente'}, ${form.ruolo_agente || 'assistente AI'} per "${business?.nome || 'il business'}".

TONO: ${form.tono}
LINGUA: ${form.lingua}

SERVIZI:
${form.servizi || 'Non specificati'}

REGOLE - NON FARE MAI:
${form.cose_da_non_fare || 'Nessuna restrizione specificata'}

FAQ:
${form.faq || 'Nessuna FAQ'}

ORARI: ${form.orario_inizio} - ${form.orario_fine}, giorni: ${form.giorni_attivi.join(', ')}
${form.fuori_orario_attivo ? `FUORI ORARIO: ${form.messaggio_fuori_orario}` : ''}

SCALARE ALL'UMANO QUANDO:
${form.escalation_rules.length > 0 ? form.escalation_rules.join('\n') : 'Mai'}`;
    updateField('ai_prompt', prompt);
  };

  const promptQuality = !form.servizi && !form.nome_agente ? 'incompleta' : (!form.cose_da_non_fare && !form.faq ? 'base' : 'ottimizzata');
  const qualityColor = promptQuality === 'incompleta' ? 'text-red-400' : promptQuality === 'base' ? 'text-yellow-400' : 'text-green-400';
  const qualityDot = promptQuality === 'incompleta' ? '🔴' : promptQuality === 'base' ? '🟡' : '🟢';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Configura il tuo Agente
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn("text-xs font-medium", qualityColor)}>{qualityDot} Configurazione {promptQuality}</span>
            {autoSaved && <span className="text-xs text-green-400">✓ Salvato</span>}
          </div>
        </div>
        <Button onClick={handleSaveAndActivate} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salva e Attiva
        </Button>
      </div>

      {/* Sezione 1 — Identità */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Identità agente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome agente</Label>
            <Input value={form.nome_agente} onChange={e => updateField('nome_agente', e.target.value)} placeholder='Es. "Sofia"' className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label>Ruolo</Label>
            <Input value={form.ruolo_agente} onChange={e => updateField('ruolo_agente', e.target.value)} placeholder="Es. Assistente vendite" className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label>Tono</Label>
            <Select value={form.tono} onValueChange={v => updateField('tono', v)}>
              <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formale">Formale</SelectItem>
                <SelectItem value="professionale">Professionale</SelectItem>
                <SelectItem value="amichevole">Amichevole</SelectItem>
                <SelectItem value="diretto">Diretto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lingua principale</Label>
            <Input value={form.lingua} onChange={e => updateField('lingua', e.target.value)} className="mt-1 bg-secondary border-border" />
          </div>
        </div>
      </section>

      {/* Sezione 2 — Business */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Conosce il tuo business</h2>
        <div>
          <Label>Descrivi i tuoi servizi</Label>
          <Textarea value={form.servizi} onChange={e => updateField('servizi', e.target.value)} placeholder="Es. Creo siti web, app mobile, sistemi AI. Prezzi da 500€ a 5.000€..." className="mt-1 bg-secondary border-border h-24" />
        </div>
        <div>
          <Label>Cosa NON deve mai dire o fare</Label>
          <Textarea value={form.cose_da_non_fare} onChange={e => updateField('cose_da_non_fare', e.target.value)} placeholder="Es. Non dare prezzi esatti, non parlare della concorrenza..." className="mt-1 bg-secondary border-border h-20" />
        </div>
        <div>
          <Label>Domande frequenti e risposte</Label>
          <Textarea value={form.faq} onChange={e => updateField('faq', e.target.value)} placeholder="Q: Quanto costa un sito web?&#10;A: I prezzi partono da 500€ e variano in base alla complessità." className="mt-1 bg-secondary border-border h-28" />
        </div>
      </section>

      {/* Sezione 3 — Comportamento */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Comportamento automatico</h2>
        <div className="flex items-center justify-between">
          <Label>Rispondi automaticamente</Label>
          <Switch checked={form.auto_risposta} onCheckedChange={v => updateField('auto_risposta', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dalle</Label>
            <Input type="time" value={form.orario_inizio} onChange={e => updateField('orario_inizio', e.target.value)} className="mt-1 bg-secondary border-border" />
          </div>
          <div>
            <Label>Alle</Label>
            <Input type="time" value={form.orario_fine} onChange={e => updateField('orario_fine', e.target.value)} className="mt-1 bg-secondary border-border" />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Giorni attivi</Label>
          <div className="flex flex-wrap gap-2">
            {giorni.map(g => (
              <label key={g} className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all",
                form.giorni_attivi.includes(g) ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground'
              )}>
                <input type="checkbox" className="hidden" checked={form.giorni_attivi.includes(g)} onChange={e => {
                  const updated = e.target.checked ? [...form.giorni_attivi, g] : form.giorni_attivi.filter(d => d !== g);
                  updateField('giorni_attivi', updated);
                }} />
                {g.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Messaggio fuori orario</Label>
          <Switch checked={form.fuori_orario_attivo} onCheckedChange={v => updateField('fuori_orario_attivo', v)} />
        </div>
        {form.fuori_orario_attivo && (
          <Textarea value={form.messaggio_fuori_orario} onChange={e => updateField('messaggio_fuori_orario', e.target.value)} placeholder="Grazie per il tuo messaggio! Siamo fuori orario..." className="bg-secondary border-border h-16" />
        )}
      </section>

      {/* Sezione 4 — Escalation */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Quando scalare all'umano</h2>
        <div className="space-y-2">
          {escalationOptions.map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={form.escalation_rules.includes(opt)} onCheckedChange={checked => {
                const updated = checked ? [...form.escalation_rules, opt] : form.escalation_rules.filter(r => r !== opt);
                updateField('escalation_rules', updated);
              }} />
              <span className="text-sm text-foreground">{opt}</span>
            </label>
          ))}
        </div>
        <div>
          <Label>Email/numero per notifica</Label>
          <Input value={form.email_notifica} onChange={e => updateField('email_notifica', e.target.value)} placeholder="email@esempio.com" className="mt-1 bg-secondary border-border" />
        </div>
      </section>

      {/* Sezione 5 — Simulatore */}
      <section className="bg-card border border-border rounded-xl p-5">
        <AgentSimulator business={business} config={form} />
      </section>

      {/* Sezione 6 — Prompt avanzato */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced" className="bg-card border border-border rounded-xl">
          <AccordionTrigger className="px-5 text-sm font-semibold">Modalità avanzata — System Prompt</AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-3">
            <Textarea value={form.ai_prompt} onChange={e => updateField('ai_prompt', e.target.value)} className="bg-secondary border-border h-48 font-mono text-xs" />
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={generatePrompt}>
                <RotateCcw className="w-3 h-3 mr-1" /> Rigenera da configurazione
              </Button>
              <span className={cn("text-xs font-medium", qualityColor)}>{qualityDot} {promptQuality}</span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}