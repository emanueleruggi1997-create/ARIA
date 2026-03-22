import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, Rocket, ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATO_COLORS = {
  bozza: 'bg-muted text-muted-foreground',
  schedulata: 'bg-blue-500/10 text-blue-400',
  inviata: 'bg-green-500/10 text-green-400',
  in_corso: 'bg-yellow-500/10 text-yellow-400',
};

export default function CampaignsTab({ businessId }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [menuId, setMenuId] = useState(null);
  const [form, setForm] = useState({
    nome: '', oggetto: '', preview_text: '', mittente_nome: '', mittente_email: '',
    template_id: '', destinatari_tag: '', send_mode: 'subito', scheduled_at: '',
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => base44.entities.EmailCampaign.filter({ business_id: businessId }, '-created_date'),
    enabled: !!businessId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-email', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId, stato: 'attivo' }),
    enabled: !!businessId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', businessId],
    queryFn: () => base44.entities.EmailTemplate.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];
  const destinatariCount = form.destinatari_tag
    ? contacts.filter(c => (c.tags || []).includes(form.destinatari_tag)).length
    : contacts.length;

  const handleLaunch = async () => {
    const now = new Date().toISOString();
    await base44.entities.EmailCampaign.create({
      business_id: businessId,
      nome: form.nome,
      oggetto: form.oggetto,
      preview_text: form.preview_text,
      mittente_nome: form.mittente_nome,
      mittente_email: form.mittente_email,
      template_id: form.template_id,
      stato: form.send_mode === 'subito' ? 'inviata' : 'schedulata',
      destinatari_count: destinatariCount,
      destinatari_tag: form.destinatari_tag,
      scheduled_at: form.send_mode === 'schedula' ? form.scheduled_at : null,
      sent_at: form.send_mode === 'subito' ? now : null,
      aperture: 0, click: 0, disiscrizioni: 0,
    });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    setShowCreate(false);
    setStep(1);
    setForm({ nome: '', oggetto: '', preview_text: '', mittente_nome: '', mittente_email: '', template_id: '', destinatari_tag: '', send_mode: 'subito', scheduled_at: '' });
  };

  const handleDelete = async (id) => {
    await base44.entities.EmailCampaign.delete(id);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    setMenuId(null);
  };

  const handleDuplicate = async (c) => {
    await base44.entities.EmailCampaign.create({ ...c, id: undefined, nome: c.nome + ' (copia)', stato: 'bozza', sent_at: null, aperture: 0, click: 0 });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    setMenuId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campagne Email</h2>
        <Button size="sm" onClick={() => { setShowCreate(true); setStep(1); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuova campagna
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">🚀</div>
          <p className="text-base font-medium text-foreground">Nessuna campagna ancora</p>
          <p className="text-sm mt-1 mb-4">Crea la tua prima campagna email</p>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5 mr-1.5" /> Crea campagna</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                {['Nome', 'Oggetto', 'Destinatari', 'Stato', 'Data', 'Aperture', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell first:table-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{c.nome}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{c.oggetto}</td>
                  <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">{c.destinatari_count}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STATO_COLORS[c.stato] || 'bg-muted text-muted-foreground')}>
                      {c.stato}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {c.sent_at ? format(new Date(c.sent_at), 'dd/MM/yy HH:mm') : c.scheduled_at ? `📅 ${format(new Date(c.scheduled_at), 'dd/MM/yy')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">
                    {c.stato === 'inviata' && c.destinatari_count > 0 ? `${Math.round((c.aperture / c.destinatari_count) * 100)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="relative">
                      <button onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {menuId === c.id && (
                        <div className="absolute right-0 top-8 z-30 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                          <button onClick={() => handleDuplicate(c)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                            <Copy className="w-3 h-3" /> Duplica
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                            <Trash2 className="w-3 h-3" /> Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create wizard */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Campagna — Step {step}/4</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 mb-4">
            {[1,2,3,4].map(s => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all", s <= step ? 'bg-primary' : 'bg-secondary')} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">📝 Dettagli campagna</h3>
              <div><Label>Nome campagna (interno)</Label><Input value={form.nome} onChange={e => setForm(p => ({...p, nome: e.target.value}))} className="mt-1 bg-secondary border-border" /></div>
              <div><Label>Oggetto email</Label><Input value={form.oggetto} onChange={e => setForm(p => ({...p, oggetto: e.target.value}))} className="mt-1 bg-secondary border-border" placeholder="Oggetto che vede il destinatario" /></div>
              <div><Label>Preview text</Label><Input value={form.preview_text} onChange={e => setForm(p => ({...p, preview_text: e.target.value}))} className="mt-1 bg-secondary border-border" placeholder="Testo breve sotto l'oggetto" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome mittente</Label><Input value={form.mittente_nome} onChange={e => setForm(p => ({...p, mittente_nome: e.target.value}))} className="mt-1 bg-secondary border-border" /></div>
                <div><Label>Email mittente</Label><Input value={form.mittente_email} onChange={e => setForm(p => ({...p, mittente_email: e.target.value}))} className="mt-1 bg-secondary border-border" /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">🎨 Scegli template</h3>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessun template salvato. Vai alla tab "Email Marketing" per crearne uno.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setForm(p => ({...p, template_id: t.id}))}
                      className={cn("w-full text-left p-3 rounded-lg border transition-all",
                        form.template_id === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'
                      )}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          form.template_id === t.id ? 'border-primary bg-primary' : 'border-border'
                        )}>
                          {form.template_id === t.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.nome}</p>
                          <p className="text-xs text-muted-foreground">{t.categoria}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">👥 Destinatari</h3>
              <div>
                <Label>Filtra per tag (opzionale)</Label>
                <Select value={form.destinatari_tag} onValueChange={v => setForm(p => ({...p, destinatari_tag: v}))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue placeholder="Tutti i contatti attivi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tutti i contatti attivi</SelectItem>
                    {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-primary">📊 Questa campagna raggiungerà <strong>{destinatariCount}</strong> contatti</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">🚀 Invio</h3>
              <div className="space-y-2">
                {['subito', 'schedula'].map(mode => (
                  <button key={mode} onClick={() => setForm(p => ({...p, send_mode: mode}))}
                    className={cn("w-full text-left p-3 rounded-lg border transition-all",
                      form.send_mode === mode ? 'border-primary bg-primary/5' : 'border-border'
                    )}>
                    <p className="text-sm font-medium text-foreground">{mode === 'subito' ? '⚡ Invia subito' : '📅 Schedula invio'}</p>
                  </button>
                ))}
              </div>
              {form.send_mode === 'schedula' && (
                <div><Label>Data e ora invio</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({...p, scheduled_at: e.target.value}))} className="mt-1 bg-secondary border-border" /></div>
              )}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                <p><span className="text-foreground font-medium">Campagna:</span> {form.nome}</p>
                <p><span className="text-foreground font-medium">Oggetto:</span> {form.oggetto}</p>
                <p><span className="text-foreground font-medium">Destinatari:</span> {destinatariCount}</p>
              </div>
              <Button className="w-full" onClick={handleLaunch} disabled={!form.nome || !form.oggetto}>
                <Rocket className="w-4 h-4 mr-2" /> Lancia campagna 🚀
              </Button>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
            {step < 4 && (
              <Button size="sm" onClick={() => setStep(s => Math.min(4, s + 1))}>
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}