import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import MobileTabSelect from '@/components/ui/MobileTabSelect';
import LeadCard from '@/components/crm/LeadCard';
import LeadDetailModal from '@/components/crm/LeadDetailModal';
import ContactsTab from '@/components/crm/ContactsTab';
import TemplateLibrary from '@/components/email/TemplateLibrary';
import CampaignsTab from '@/components/email/CampaignsTab';
import AutomationsTab from '@/components/email/AutomationsTab';
import EmailStatsTab from '@/components/email/EmailStatsTab';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columns = [
  { id: 'nuovo', label: 'Nuovo', color: 'bg-blue-500' },
  { id: 'qualificato', label: 'Qualificato', color: 'bg-yellow-500' },
  { id: 'preventivo_inviato', label: 'Preventivo', color: 'bg-purple-500' },
  { id: 'chiuso_vinto', label: 'Vinto', color: 'bg-green-500' },
  { id: 'chiuso_perso', label: 'Perso', color: 'bg-red-500' },
];

function LeadsKanban({ businessId }) {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddToMailingList, setShowAddToMailingList] = useState(null);
  const [newLead, setNewLead] = useState({ contact_nome: '', tipo_progetto: '', canale: 'whatsapp' });
  const [mobileFilter, setMobileFilter] = useState('tutti');
  const [creatingLead, setCreatingLead] = useState(false);
  const [movingLeadId, setMovingLeadId] = useState(null);
  const [deletingLeadId, setDeletingLeadId] = useState(null);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', businessId],
    queryFn: () => base44.entities.Lead.filter({ business_id: businessId }),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ['leads', businessId] });

  const handleUpdateLead = async (id, data) => {
    try {
      await base44.entities.Lead.update(id, data);
      if (data.stato === 'chiuso_vinto') {
        const lead = leads.find(l => l.id === id);
        if (lead) setShowAddToMailingList(lead);
      }
      invalidateLeads();
      setSelectedLead(null);
    } catch (err) {
      console.error('[CRM] handleUpdateLead error:', err);
    }
  };

  const handleDeleteLead = async (id) => {
    if (deletingLeadId === id) return;
    setDeletingLeadId(id);
    try {
      await base44.entities.Lead.delete(id);
      invalidateLeads();
    } catch (err) {
      console.error('[CRM] handleDeleteLead error:', err);
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleMoveLead = async (lead, newStato) => {
    if (movingLeadId === lead.id) return;
    setMovingLeadId(lead.id);
    try {
      await base44.entities.Lead.update(lead.id, { stato: newStato });
      if (newStato === 'chiuso_vinto') setShowAddToMailingList(lead);
      invalidateLeads();
    } catch (err) {
      console.error('[CRM] handleMoveLead error:', err);
    } finally {
      setMovingLeadId(null);
    }
  };

  const handleCreateLead = async () => {
    if (!newLead.contact_nome.trim() || creatingLead) return;
    setCreatingLead(true);
    try {
      await base44.entities.Lead.create({ ...newLead, business_id: businessId, stato: 'nuovo' });
      invalidateLeads();
      setShowCreate(false);
      setNewLead({ contact_nome: '', tipo_progetto: '', canale: 'whatsapp' });
    } catch (err) {
      console.error('[CRM] handleCreateLead error:', err);
    } finally {
      setCreatingLead(false);
    }
  };

  const handleAddToMailingList = async (lead) => {
    try {
      await base44.entities.ContactEmail.create({
        business_id: businessId,
        nome: lead.contact_nome,
        email: '',
        tags: ['cliente'],
        fonte: lead.canale || 'whatsapp',
        stato: 'attivo',
      });
      queryClient.invalidateQueries({ queryKey: ['contacts-email', businessId] });
    } catch (err) {
      console.error('[CRM] handleAddToMailingList error:', err);
    } finally {
      setShowAddToMailingList(null);
    }
  };

  const totalValue = leads.reduce((s, l) => s + (l.budget_max || 0), 0);
  const wonLeads = leads.filter(l => l.stato === 'chiuso_vinto').length;
  const convRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{leads.length} lead totali</span>
          <span className="text-xs text-muted-foreground">Valore: €{totalValue.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">Conversione: {convRate}%</span>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="hidden md:flex">
          <Plus className="w-4 h-4 mr-2" /> Nuovo Lead
        </Button>
        <button onClick={() => setShowCreate(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-base font-medium text-foreground">Nessun lead ancora</p>
          <p className="text-sm mt-1 mb-4">Aggiungi il tuo primo lead per iniziare</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Aggiungi primo lead
          </Button>
        </div>
      )}

      {/* Mobile: lista verticale con filtro */}
      {leads.length > 0 && (
        <>
          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            <Select value={mobileFilter} onValueChange={setMobileFilter}>
              <SelectTrigger className="w-full bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti ({leads.length})</SelectItem>
                {columns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label} ({leads.filter(l => l.stato === c.id).length})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              {leads.filter(l => mobileFilter === 'tutti' || l.stato === mobileFilter).map(lead => {
                const col = columns.find(c => c.id === lead.stato);
                return (
                  <div key={lead.id} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${col?.color || 'bg-muted'}`} />
                    <div className="flex-1">
                      <LeadCard lead={lead} onClick={setSelectedLead} onDelete={handleDeleteLead} onMove={handleMoveLead} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Kanban */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
            {columns.map(col => {
              const colLeads = leads.filter(l => l.stato === col.id);
              return (
                <div key={col.id} className="min-w-[240px] flex-1">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{colLeads.length}</span>
                  </div>
                  <div className="space-y-2 bg-secondary/30 rounded-xl p-2 min-h-[200px]">
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onClick={setSelectedLead} onDelete={handleDeleteLead} onMove={handleMoveLead} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <LeadDetailModal lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleUpdateLead} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nuovo Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome contatto</Label><Input value={newLead.contact_nome} onChange={e => setNewLead(p => ({ ...p, contact_nome: e.target.value }))} className="mt-1 bg-secondary border-border" /></div>
            <div><Label>Tipo progetto</Label><Input value={newLead.tipo_progetto} onChange={e => setNewLead(p => ({ ...p, tipo_progetto: e.target.value }))} className="mt-1 bg-secondary border-border" /></div>
            <div>
              <Label>Canale</Label>
              <Select value={newLead.canale} onValueChange={v => setNewLead(p => ({ ...p, canale: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateLead} className="w-full" disabled={!newLead.contact_nome.trim() || creatingLead}>
              {creatingLead ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />Creazione...</> : 'Crea Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to mailing list popup */}
      <Dialog open={!!showAddToMailingList} onOpenChange={() => setShowAddToMailingList(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>🎉 Lead vinto!</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vuoi aggiungere <strong className="text-foreground">{showAddToMailingList?.contact_nome}</strong> alla mailing list email?
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleAddToMailingList(showAddToMailingList)}>
                📧 Sì, aggiungi alla mailing list
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowAddToMailingList(null)}>
                No, grazie
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CRM() {
  const { business } = useBusiness();
  const [crmTab, setCrmTab] = useState('lead');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CRM & Email Marketing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestisci lead, contatti e campagne email</p>
      </div>

      <Tabs value={crmTab} onValueChange={setCrmTab}>
        <MobileTabSelect
          value={crmTab}
          onValueChange={setCrmTab}
          tabs={[
            { value: 'lead', label: '👥 Lead' },
            { value: 'contatti', label: '📋 Contatti' },
            { value: 'template', label: '🎨 Email Marketing' },
            { value: 'campagne', label: '🚀 Campagne' },
            { value: 'statistiche', label: '📊 Statistiche' },
          ]}
        />

        <TabsContent value="lead" className="mt-4">
          <LeadsKanban businessId={business?.id} />
        </TabsContent>

        <TabsContent value="contatti" className="mt-4">
          <ContactsTab businessId={business?.id} />
        </TabsContent>

        <TabsContent value="template" className="mt-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Libreria Template</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Scegli un template, personalizzalo e usalo nelle tue campagne</p>
          </div>
          <TemplateLibrary businessId={business?.id} />
        </TabsContent>

        <TabsContent value="campagne" className="mt-4 space-y-6">
          <CampaignsTab businessId={business?.id} />
          <div className="border-t border-border pt-6">
            <AutomationsTab businessId={business?.id} />
          </div>
        </TabsContent>

        <TabsContent value="statistiche" className="mt-4">
          <EmailStatsTab businessId={business?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}