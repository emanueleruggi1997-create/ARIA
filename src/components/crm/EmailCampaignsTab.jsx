import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, Clock, CheckCircle, AlertCircle, Loader2, Zap, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATO_CONFIG = {
  bozza: { label: 'Bozza', color: 'text-muted-foreground bg-secondary' },
  schedulata: { label: 'Schedulata', color: 'text-yellow-400 bg-yellow-400/10' },
  in_corso: { label: 'In corso', color: 'text-blue-400 bg-blue-400/10' },
  inviata: { label: 'Inviata', color: 'text-green-400 bg-green-400/10' },
};

const TEMPLATES = [
  { id: 'preventivo', emoji: '🎯', label: 'Preventivo personalizzato', desc: 'Per un lead specifico, con dati progetto' },
  { id: 'newsletter', emoji: '📢', label: 'Newsletter', desc: 'Contenuto informativo del settore' },
  { id: 'followup', emoji: '🔄', label: 'Follow-up lead freddo', desc: 'Per chi non risponde da giorni' },
  { id: 'benvenuto', emoji: '🎉', label: 'Benvenuto nuovo cliente', desc: 'Automatica quando il lead è vinto' },
  { id: 'report', emoji: '📊', label: 'Report mensile', desc: 'Per clienti gestione social' },
];

const EMPTY_WIZARD = {
  nome: '',
  oggetto: '',
  preview_text: '',
  template_type: '',
  template_html: '',
  destinatari_tag: 'tutti',
  scheduled_at: '',
  stato: 'bozza',
};

export default function EmailCampaignsTab({ businessId }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_WIZARD);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns', businessId],
    queryFn: () => base44.entities.EmailCampaign.filter({ business_id: businessId }, '-created_date'),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const { data: emailContacts = [] } = useQuery({
    queryKey: ['email-contacts', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId, stato: 'attivo' }),
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['email-campaigns', businessId] });
  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleGenerateTemplate = async (type) => {
    set('template_type', type);
    setGeneratingTemplate(true);
    try {
      const typeLabel = TEMPLATES.find(t => t.id === type)?.label || type;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera il testo di una email professionale di tipo: "${typeLabel}" per un business che usa l'AI.
Scrivi in italiano. Il testo deve essere breve (max 150 parole), caldo, professionale e con una CTA chiara.
Restituisci SOLO il corpo del testo dell'email, niente oggetto o firma. Usa [Nome] come variabile per il destinatario.`,
        model: 'gpt_5_mini',
      });
      set('template_html', typeof res === 'string' ? res : res?.text || res?.content || '');
    } catch {
      set('template_html', 'Ciao [Nome],\n\nGrazie per il tuo interesse. Ti contattiamo per...\n\nA presto!');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.EmailCampaign.create({
        ...form,
        business_id: businessId,
        destinatari_count: emailContacts.length,
      });
      invalidate();
      setShowCreate(false);
      setForm(EMPTY_WIZARD);
      setStep(1);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_WIZARD);
    setStep(1);
    setShowCreate(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{campaigns.length} campagne totali</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nuova campagna
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-foreground">Nessuna campagna</p>
          <p className="text-xs mt-1 mb-4">Crea la tua prima campagna email con ARIA</p>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Crea campagna</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="col-span-2">Nome</span>
            <span>Stato</span>
            <span>Destinatari</span>
            <span>Data</span>
          </div>
          {campaigns.map(c => {
            const stato = STATO_CONFIG[c.stato] || STATO_CONFIG.bozza;
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
                <div className="md:grid md:grid-cols-5 md:gap-4 md:items-center">
                  <div className="col-span-2 mb-2 md:mb-0">
                    <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                    {c.oggetto && <p className="text-xs text-muted-foreground truncate">{c.oggetto}</p>}
                  </div>
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${stato.color} w-fit`}>{stato.label}</span>
                  <span className="text-xs text-muted-foreground">{c.destinatari_count || 0} persone</span>
                  <span className="text-xs text-muted-foreground">
                    {c.sent_at ? format(new Date(c.sent_at), 'd MMM', { locale: it }) : c.scheduled_at ? `📅 ${format(new Date(c.scheduled_at), 'd MMM', { locale: it })}` : '—'}
                  </span>
                </div>
                {(c.aperture > 0 || c.click > 0) && (
                  <div className="flex gap-4 mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Aperture: <strong className="text-foreground">{c.destinatari_count > 0 ? Math.round((c.aperture / c.destinatari_count) * 100) : 0}%</strong></span>
                    <span className="text-xs text-muted-foreground">Click: <strong className="text-foreground">{c.destinatari_count > 0 ? Math.round((c.click / c.destinatari_count) * 100) : 0}%</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Wizard */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Campagna Email</DialogTitle>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', s <= step ? 'bg-primary' : 'bg-secondary')} />
              ))}
            </div>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Step 1 — Dettagli</p>
              <div>
                <Label className="text-xs text-muted-foreground">Nome campagna *</Label>
                <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Es: Newsletter Aprile 2025" className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Oggetto email *</Label>
                <Input value={form.oggetto} onChange={e => set('oggetto', e.target.value)} placeholder="Es: Una novità per te da Emaral 🚀" className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Preview text</Label>
                <Input value={form.preview_text} onChange={e => set('preview_text', e.target.value)} placeholder="Testo visibile nell'anteprima della casella di posta..." className="mt-1 bg-secondary border-border" />
              </div>
              <Button onClick={() => setStep(2)} className="w-full" disabled={!form.nome.trim() || !form.oggetto.trim()}>
                Avanti →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Step 2 — Template</p>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleGenerateTemplate(t.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                      form.template_type === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary/30 hover:border-border/80'
                    )}
                  >
                    <span className="text-2xl shrink-0">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                    {form.template_type === t.id && generatingTemplate && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              {form.template_html && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Testo generato (modificabile)</Label>
                  <Textarea
                    value={form.template_html}
                    onChange={e => set('template_html', e.target.value)}
                    className="bg-secondary border-border h-32 text-sm resize-none"
                  />
                  <button
                    onClick={() => handleGenerateTemplate(form.template_type)}
                    className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Rigenera con ARIA
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Indietro</Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={!form.template_html}>Avanti →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Step 3 — Destinatari</p>
              <div>
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select value={form.destinatari_tag} onValueChange={v => set('destinatari_tag', v)}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i contatti attivi</SelectItem>
                    <SelectItem value="instagram">Solo contatti IG</SelectItem>
                    <SelectItem value="whatsapp">Solo contatti WA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-sm font-semibold text-foreground">📬 Questa campagna raggiungerà</p>
                <p className="text-2xl font-bold text-primary mt-1">{emailContacts.length} <span className="text-sm font-normal text-muted-foreground">persone</span></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Indietro</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Avanti →</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Step 4 — Invio</p>
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Riepilogo</p>
                <p className="text-sm font-semibold text-foreground">{form.nome}</p>
                <p className="text-xs text-muted-foreground">{form.oggetto}</p>
                <p className="text-xs text-muted-foreground">{emailContacts.length} destinatari</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Schedula invio (opzionale)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => set('scheduled_at', e.target.value)}
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">← Indietro</Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-primary"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {form.scheduled_at ? 'Schedula 📅' : 'Salva bozza'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}