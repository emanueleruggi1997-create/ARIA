import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

const statoLabels = {
  nuovo: 'Nuovo', qualificato: 'Qualificato', preventivo_inviato: 'Preventivo Inviato',
  chiuso_vinto: 'Vinto', chiuso_perso: 'Perso'
};

export default function LeadDetailModal({ lead, open, onClose, onUpdate }) {
  const { business } = useBusiness();
  const [qualifying, setQualifying] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [quote, setQuote] = useState('');

  const handleQualify = async () => {
    setQualifying(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analizza questo lead per il business "${business?.nome}" (servizi: ${business?.servizi || 'non specificati'}).
Lead: ${lead.contact_nome}, progetto: ${lead.tipo_progetto || 'non specificato'}, note: ${lead.note_ai || 'nessuna'}.

Restituisci un JSON con: tipo_progetto, budget_min, budget_max, note_ai (analisi dettagliata).`,
      response_json_schema: {
        type: 'object',
        properties: {
          tipo_progetto: { type: 'string' },
          budget_min: { type: 'number' },
          budget_max: { type: 'number' },
          note_ai: { type: 'string' }
        }
      }
    });
    await onUpdate(lead.id, { ...result, stato: 'qualificato' });
    setQualifying(false);
  };

  const handleGenerateQuote = async () => {
    setGeneratingQuote(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Genera un preventivo professionale in italiano per:
Business: ${business?.nome}, servizi: ${business?.servizi || 'non specificati'}
Cliente: ${lead.contact_nome}
Progetto: ${lead.tipo_progetto || 'non specificato'}
Budget: €${lead.budget_min || 0} — €${lead.budget_max || 0}
Note: ${lead.note_ai || 'nessuna'}

Formato professionale con intestazione, dettagli servizi, prezzi, tempistiche, condizioni.`,
    });
    setQuote(result);
    setGeneratingQuote(false);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{lead.contact_nome || 'Dettaglio Lead'}</span>
            <Badge variant="outline">{statoLabels[lead.stato] || lead.stato}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Progetto</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{lead.tipo_progetto || '—'}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Budget stimato</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                €{lead.budget_min || 0} — €{lead.budget_max || 0}
              </p>
            </div>
          </div>

          {lead.note_ai && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Note AI</p>
              <p className="text-sm text-foreground">{lead.note_ai}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleQualify} disabled={qualifying} className="flex-1">
              {qualifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Qualifica con AI
            </Button>
            <Button variant="outline" onClick={handleGenerateQuote} disabled={generatingQuote} className="flex-1">
              {generatingQuote ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Genera preventivo
            </Button>
          </div>

          {quote && (
            <div className="bg-secondary rounded-lg p-3 max-h-60 overflow-y-auto">
              <p className="text-xs text-primary font-medium mb-2">📄 Preventivo generato</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{quote}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}