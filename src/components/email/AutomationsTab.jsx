import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const DEFAULT_AUTOMATIONS = [
  { tipo: 'benvenuto', nome: 'Benvenuto nuovo contatto', emoji: '🟢', desc: 'Invia email di benvenuto quando un contatto si iscrive dal form', delay_opzioni: [0, 1], delay_label: ['Immediato', 'Dopo 1 giorno'] },
  { tipo: 'followup_lead', nome: 'Follow-up lead non risponde', emoji: '🟡', desc: 'Invia email se un lead non risponde dopo X giorni', delay_opzioni: [3, 5, 7], delay_label: ['3 giorni', '5 giorni', '7 giorni'] },
  { tipo: 'reengagement', nome: 'Re-engagement inattivi', emoji: '🔵', desc: 'Invia email ai contatti che non aprono da 30 giorni', delay_opzioni: [30], delay_label: ['Mensile'] },
  { tipo: 'followup_preventivo', nome: 'Dopo preventivo inviato', emoji: '🟣', desc: 'Invia follow-up se il lead non risponde al preventivo', delay_opzioni: [2, 5], delay_label: ['2 giorni', '5 giorni'] },
];

export default function AutomationsTab({ businessId }) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(null);

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['email-automations', businessId],
    queryFn: () => base44.entities.EmailAutomation.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', businessId],
    queryFn: () => base44.entities.EmailTemplate.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const getAutomation = (tipo) => automations.find(a => a.tipo === tipo);

  const handleToggle = async (def, checked) => {
    setUpdating(def.tipo);
    const existing = getAutomation(def.tipo);
    if (existing) {
      await base44.entities.EmailAutomation.update(existing.id, { attiva: checked });
    } else {
      await base44.entities.EmailAutomation.create({
        business_id: businessId,
        tipo: def.tipo,
        nome: def.nome,
        attiva: checked,
        delay_giorni: def.delay_opzioni[0],
        invii_totali: 0,
        aperture_totali: 0,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['email-automations'] });
    setUpdating(null);
  };

  const handleDelay = async (def, giorni) => {
    const existing = getAutomation(def.tipo);
    if (existing) {
      await base44.entities.EmailAutomation.update(existing.id, { delay_giorni: Number(giorni) });
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
    }
  };

  const handleTemplate = async (def, templateId) => {
    const existing = getAutomation(def.tipo);
    if (existing) {
      await base44.entities.EmailAutomation.update(existing.id, { template_id: templateId });
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Automazioni Email</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Attiva sequenze automatiche basate sul comportamento dei contatti</p>
      </div>

      <div className="space-y-3">
        {DEFAULT_AUTOMATIONS.map(def => {
          const auto = getAutomation(def.tipo);
          const isActive = auto?.attiva || false;
          const isUpdating = updating === def.tipo;

          return (
            <div key={def.tipo} className={`bg-card border rounded-xl p-4 transition-all ${isActive ? 'border-primary/30' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{def.emoji}</span>
                    <p className="text-sm font-semibold text-foreground">{def.nome}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{def.desc}</p>

                  {isActive && (
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Delay:</span>
                        <Select value={String(auto?.delay_giorni ?? def.delay_opzioni[0])} onValueChange={v => handleDelay(def, v)}>
                          <SelectTrigger className="h-7 text-xs bg-secondary border-border w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {def.delay_opzioni.map((d, i) => <SelectItem key={d} value={String(d)}>{def.delay_label[i]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {templates.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Template:</span>
                          <Select value={auto?.template_id || ''} onValueChange={v => handleTemplate(def, v)}>
                            <SelectTrigger className="h-7 text-xs bg-secondary border-border w-36"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                            <SelectContent>
                              {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {auto && (
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>📤 Invii: {auto.invii_totali || 0}</span>
                      <span>👁 Aperture: {auto.aperture_totali || 0}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isUpdating && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                  <Switch checked={isActive} onCheckedChange={v => handleToggle(def, v)} disabled={isUpdating} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}