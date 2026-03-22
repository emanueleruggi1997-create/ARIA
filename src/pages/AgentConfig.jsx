import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, Save, Loader2, RotateCcw, Copy } from 'lucide-react';
import AgentSimulator from '@/components/agent/AgentSimulator';
import AgentAvatar, { AVATAR_COLORS } from '@/components/AgentAvatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import debounce from 'lodash/debounce';
import { format } from 'date-fns';

const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const ESCALATION_OPTS = [
  'Cliente arrabbiato o reclamo',
  'Richiesta prezzo esatto',
  'Richiesta rimborso',
  'Domanda tecnica complessa',
];


const STATUS_MAP = {
  attivo: { label: 'ATTIVO', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', dot: 'bg-green-500' },
  pausa: { label: 'IN PAUSA', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500' },
  off: { label: 'DISATTIVO', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' },
};

export default function AgentConfig() {
  const { business, refreshBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [form, setForm] = useState({
    nome_agente: '', ruolo_agente: '', tono: 'professionale', lingua: 'Italiano',
    avatar_agente: '🤖', prezzi: '', servizi: '', cose_da_non_fare: '', faq: '',
    auto_risposta: true, orario_inizio: '08:00', orario_fine: '20:00',
    giorni_attivi: ['lun','mar','mer','gio','ven'], fuori_orario_attivo: true,
    messaggio_fuori_orario: '', escalation_rules: [], email_notifica: '', ai_prompt: '',
    stato_agente: 'attivo',
  });

  useEffect(() => {
    if (business) {
      setForm({
        nome_agente: business.nome_agente || '',
        ruolo_agente: business.ruolo_agente || '',
        tono: business.tono || 'professionale',
        lingua: business.lingua || 'Italiano',
        avatar_agente: business.avatar_agente || '🤖',
        prezzi: business.prezzi || '',
        servizi: business.servizi || '',
        cose_da_non_fare: business.cose_da_non_fare || '',
        faq: business.faq || '',
        auto_risposta: business.auto_risposta !== false,
        orario_inizio: business.orario_inizio || '08:00',
        orario_fine: business.orario_fine || '20:00',
        giorni_attivi: business.giorni_attivi || ['lun','mar','mer','gio','ven'],
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

  const handleToggleAgent = async () => {
    const next = form.stato_agente === 'attivo' ? 'off' : 'attivo';
    updateField('stato_agente', next);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Business.update(business.id, form);
    await refreshBusiness();
    toast({ title: '✅ Agente salvato!' });
    setSaving(false);
  };

  const generatePrompt = () => {
    const prompt = `Sei ${form.nome_agente || 'un assistente'}, ${form.ruolo_agente || 'assistente AI'} per "${business?.nome}". ${form.avatar_agente}

TONO: ${form.tono} | LINGUA: ${form.lingua}

SERVIZI:
${form.servizi || 'Non specificati'}

PREZZI:
${form.prezzi || 'Non specificati'}

NON FARE MAI:
${form.cose_da_non_fare || 'Nessuna restrizione'}

FAQ:
${form.faq || 'Nessuna FAQ'}

ORARI: ${form.orario_inizio}-${form.orario_fine}, giorni: ${form.giorni_attivi.join(', ')}
${form.fuori_orario_attivo ? `FUORI ORARIO: "${form.messaggio_fuori_orario}"` : ''}

SCALA ALL'UMANO QUANDO:
${form.escalation_rules.length > 0 ? form.escalation_rules.join('\n') : 'Mai'}`;
    updateField('ai_prompt', prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(form.ai_prompt);
    toast({ title: 'Prompt copiato!' });
  };

  const promptQuality = !form.servizi && !form.nome_agente ? 'incompleta' : (!form.cose_da_non_fare && !form.faq ? 'base' : 'ottimizzata');
  const qualityInfo = { incompleta: '🔴 Incompleta', base: '🟡 Base', ottimizzata: '🟢 Ottimizzata' };
  const status = STATUS_MAP[form.stato_agente] || STATUS_MAP.off;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Il tuo Agente AI
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", status.bg, status.color)}>
              <div className={cn("w-2 h-2 rounded-full", status.dot)} />
              {status.label}
            </div>
            {autoSaved && <span className="text-xs text-green-400">✓ Salvato automaticamente</span>}
            <span className="text-xs text-muted-foreground hidden sm:block">Aggiornato {format(new Date(), 'dd/MM HH:mm')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Agente</span>
            <Switch checked={form.stato_agente === 'attivo'} onCheckedChange={handleToggleAgent} />
            <span className={cn("text-sm font-medium", form.stato_agente === 'attivo' ? 'text-green-400' : 'text-muted-foreground')}>
              {form.stato_agente === 'attivo' ? 'ON' : 'OFF'}
            </span>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salva
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identita">
        <TabsList className="bg-secondary w-full justify-start overflow-x-auto">
          <TabsTrigger value="identita" className="text-xs">👤 Identità</TabsTrigger>
          <TabsTrigger value="business" className="text-xs">🏢 Business</TabsTrigger>
          <TabsTrigger value="comportamento" className="text-xs">⚙️ Comportamento</TabsTrigger>
          <TabsTrigger value="simulatore" className="text-xs">💬 Simulatore</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs">🧠 Prompt Avanzato</TabsTrigger>
        </TabsList>

        {/* Tab Identità */}
        <TabsContent value="identita" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <Label>Avatar agente</Label>
              <div className="flex items-center gap-3 mt-2">
                <AgentAvatar nome={form.nome_agente} color={form.avatar_agente || '#3B6EF8'} size="lg" />
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c.id} onClick={() => updateField('avatar_agente', c.id)}
                      title={c.label}
                      style={{ background: c.id }}
                      className={cn("w-8 h-8 rounded-full border-2 transition-all",
                        form.avatar_agente === c.id ? 'border-white scale-110' : 'border-transparent hover:border-white/50'
                      )} />
                  ))}
                </div>
              </div>
            </div>
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
                    {['formale','professionale','amichevole','diretto'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lingua</Label>
                <Select value={form.lingua} onValueChange={v => updateField('lingua', v)}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Italiano','English','Español','Français','Deutsch'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab Business */}
        <TabsContent value="business" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <Label>Servizi offerti</Label>
              <Textarea value={form.servizi} onChange={e => updateField('servizi', e.target.value)} placeholder="Descrivi i tuoi servizi in dettaglio..." className="mt-1 bg-secondary border-border h-24" />
            </div>
            <div>
              <Label>Prezzi indicativi</Label>
              <Textarea value={form.prezzi} onChange={e => updateField('prezzi', e.target.value)} placeholder="Es. Sito web base: da 500€, E-commerce: da 1.500€..." className="mt-1 bg-secondary border-border h-20" />
            </div>
            <div>
              <Label>Cosa NON deve mai dire o fare</Label>
              <Textarea value={form.cose_da_non_fare} onChange={e => updateField('cose_da_non_fare', e.target.value)} placeholder="Es. Non dare prezzi esatti, non parlare della concorrenza..." className="mt-1 bg-secondary border-border h-20" />
            </div>
            <div>
              <Label>FAQ (formato Q: / A:)</Label>
              <Textarea value={form.faq} onChange={e => updateField('faq', e.target.value)} placeholder="Q: Quanto costa un sito web?&#10;A: I prezzi partono da 500€..." className="mt-1 bg-secondary border-border h-32" />
            </div>
          </div>
        </TabsContent>

        {/* Tab Comportamento */}
        <TabsContent value="comportamento" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Rispondi automaticamente</p><p className="text-xs text-muted-foreground">L'agente risponde ai messaggi in arrivo</p></div>
              <Switch checked={form.auto_risposta} onCheckedChange={v => updateField('auto_risposta', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Dalle</Label><Input type="time" value={form.orario_inizio} onChange={e => updateField('orario_inizio', e.target.value)} className="mt-1 bg-secondary border-border" /></div>
              <div><Label>Alle</Label><Input type="time" value={form.orario_fine} onChange={e => updateField('orario_fine', e.target.value)} className="mt-1 bg-secondary border-border" /></div>
            </div>
            <div>
              <Label className="mb-2 block">Giorni attivi</Label>
              <div className="flex flex-wrap gap-2">
                {GIORNI.map(g => (
                  <label key={g} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all",
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
          </div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Scala all'umano quando:</h3>
            <div className="space-y-2">
              {ESCALATION_OPTS.map(opt => (
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
              <Label>Email notifica escalation</Label>
              <Input value={form.email_notifica} onChange={e => updateField('email_notifica', e.target.value)} placeholder="email@esempio.com" className="mt-1 bg-secondary border-border" />
            </div>
          </div>
        </TabsContent>

        {/* Tab Simulatore */}
        <TabsContent value="simulatore" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <AgentSimulator business={business} config={form} />
          </div>
        </TabsContent>

        {/* Tab Prompt Avanzato */}
        <TabsContent value="prompt" className="space-y-4 mt-4">
          <Accordion type="single" collapsible defaultValue="advanced">
            <AccordionItem value="advanced" className="bg-card border border-border rounded-xl">
              <AccordionTrigger className="px-5 text-sm font-semibold">🧠 Modalità Avanzata — System Prompt</AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Qualità configurazione: <span className="font-medium text-foreground">{qualityInfo[promptQuality]}</span></span>
                </div>
                <Textarea value={form.ai_prompt} onChange={e => updateField('ai_prompt', e.target.value)} className="bg-secondary border-border h-64 font-mono text-xs" placeholder="Il prompt verrà generato automaticamente dalla tua configurazione..." />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={generatePrompt}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Rigenera da configurazione
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyPrompt} disabled={!form.ai_prompt}>
                    <Copy className="w-3 h-3 mr-1" /> Copia prompt
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
}