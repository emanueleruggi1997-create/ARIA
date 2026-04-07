import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Save, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const STATI = [
  { value: 'lead', label: 'Lead' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'perso', label: 'Perso' },
  { value: 'inattivo', label: 'Inattivo' },
];

export default function ContactSidebar({ contact, businessId, onRefresh }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stato, setStato] = useState(contact?.stato || 'lead');
  const [note, setNote] = useState(contact?.note || '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [converting, setConverting] = useState(false);

  const { data: emailContacts = [] } = useQuery({
    queryKey: ['contacts-email', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (contact) {
      setStato(contact.stato || 'lead');
      setNote(contact.note || '');
    }
  }, [contact?.id]);

  const emailContact = contact ? emailContacts.find(c => c.nome === contact.nome || (contact.numero && c.email?.includes(contact.numero))) : null;
  const isSubscribed = emailContact?.stato === 'attivo';

  const handleToggleMailingList = async () => {
    if (!contact) return;
    if (emailContact) {
      await base44.entities.ContactEmail.update(emailContact.id, { stato: isSubscribed ? 'disiscritto' : 'attivo' });
    } else {
      await base44.entities.ContactEmail.create({
        business_id: businessId,
        nome: contact.nome,
        email: '',
        tags: [],
        fonte: contact.canale || 'manuale',
        stato: 'attivo',
      });
    }
    queryClient.invalidateQueries({ queryKey: ['contacts-email'] });
  };

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      await base44.entities.Contact.update(contact.id, { stato, note });
      onRefresh?.();
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus('err');
    }
    setSaving(false);
  };

  const handleConvertToLead = async () => {
    if (!contact) return;
    setConverting(true);
    await base44.entities.Lead.create({
      business_id: businessId,
      contact_id: contact.id,
      contact_nome: contact.nome,
      canale: contact.canale,
      stato: 'nuovo',
    });
    toast({ title: '🎯 Convertito in Lead!', description: 'Puoi trovarlo nella sezione CRM.', duration: 3000 });
    setConverting(false);
  };

  if (!contact) {
    return (
      <div className="w-64 border-l border-border flex items-center justify-center p-4 text-center">
        <p className="text-xs text-muted-foreground">Seleziona una conversazione per vedere i dettagli</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-border flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-bold text-primary">{(contact.nome || '?')[0].toUpperCase()}</span>
        </div>
        <p className="text-sm font-semibold text-foreground text-center">{contact.nome}</p>
        {contact.numero && <p className="text-xs text-muted-foreground text-center mt-0.5">{contact.numero}</p>}
        <div className="flex justify-center mt-2">
          <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium",
            contact.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
          )}>
            {contact.canale === 'whatsapp' ? '📱 WhatsApp' : '📸 Instagram'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">Stato lead</p>
          <Select value={stato} onValueChange={setStato}>
            <SelectTrigger className="bg-secondary border-border text-sm h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">Note</p>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Aggiungi note su questo contatto..."
            className="bg-secondary border-border text-sm h-24 resize-none"
          />
        </div>

        <Button size="sm" variant="outline" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          {saveStatus === 'ok' ? '💾 Salvato' : saveStatus === 'err' ? '⚠️ Errore' : 'Salva'}
        </Button>

        <Button size="sm" className="w-full" onClick={handleConvertToLead} disabled={converting}>
          {converting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
          Converti in Lead
        </Button>

        {/* Email marketing section */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">📧 Email Marketing</p>
          <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{isSubscribed ? 'Iscritto alla lista' : emailContact ? 'Non iscritto' : 'Non in lista'}</p>
              {isSubscribed && <p className="text-[10px] text-green-400">✓ Riceve le campagne</p>}
            </div>
            <Switch checked={isSubscribed} onCheckedChange={handleToggleMailingList} />
          </div>
        </div>
      </div>
    </div>
  );
}