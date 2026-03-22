import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext';
import LeadCard from '@/components/crm/LeadCard';
import LeadDetailModal from '@/components/crm/LeadDetailModal';
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

export default function CRM() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newLead, setNewLead] = useState({ contact_nome: '', tipo_progetto: '', canale: 'whatsapp' });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const handleUpdateLead = async (id, data) => {
    await base44.entities.Lead.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setSelectedLead(null);
  };

  const handleCreateLead = async () => {
    await base44.entities.Lead.create({
      ...newLead,
      business_id: business.id,
      stato: 'nuovo',
    });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setShowCreate(false);
    setNewLead({ contact_nome: '', tipo_progetto: '', canale: 'whatsapp' });
  };

  const handleChangeStatus = async (lead, newStatus) => {
    await base44.entities.Lead.update(lead.id, { stato: newStatus });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  // Pipeline stats
  const totalValue = leads.reduce((s, l) => s + (l.budget_max || 0), 0);
  const wonLeads = leads.filter(l => l.stato === 'chiuso_vinto').length;
  const convRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM / Lead</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground">{leads.length} lead totali</span>
            <span className="text-xs text-muted-foreground">Valore: €{totalValue.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Conversione: {convRate}%</span>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuovo Lead
        </Button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
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
                  <LeadCard key={lead.id} lead={lead} onClick={setSelectedLead} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      <LeadDetailModal 
        lead={selectedLead} 
        open={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        onUpdate={handleUpdateLead} 
      />

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nuovo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome contatto</Label>
              <Input value={newLead.contact_nome} onChange={e => setNewLead(p => ({ ...p, contact_nome: e.target.value }))} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label>Tipo progetto</Label>
              <Input value={newLead.tipo_progetto} onChange={e => setNewLead(p => ({ ...p, tipo_progetto: e.target.value }))} className="mt-1 bg-secondary border-border" />
            </div>
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
            <Button onClick={handleCreateLead} className="w-full" disabled={!newLead.contact_nome}>Crea Lead</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}