import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RotateCcw, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function AriaAvanzato({ form, updateField, business, autoSaved }) {
  const { toast } = useToast();
  const { t, lang } = useLang();

  const getQualityLabel = () => {
    if (!form.servizi && !form.nome_agente) return t.qualityIncomplete;
    if (!form.cose_da_non_fare && !form.faq) return t.qualityBase;
    return t.qualityOptimized;
  };

  const generatePrompt = () => {
    const prompt = lang === 'en'
      ? `You are ${form.nome_agente || 'ARIA'}, ${form.ruolo_agente || 'AI assistant'} for "${business?.nome}".

TONE: ${form.tono} | LANGUAGE: ${form.lingua}

SERVICES:
${form.servizi || 'Not specified'}

PRICES:
${form.prezzi || 'Not specified'}

NEVER DO:
${form.cose_da_non_fare || 'No restrictions'}

FAQ:
${form.faq || 'No FAQ'}

HOURS: ${form.orario_inizio}-${form.orario_fine}, days: ${(form.giorni_attivi || []).join(', ')}
${form.fuori_orario_attivo ? `OUT OF HOURS: "${form.messaggio_fuori_orario}"` : ''}

ESCALATE TO HUMAN WHEN:
${(form.escalation_rules || []).length > 0 ? form.escalation_rules.join('\n') : 'Never'}`
      : `Sei ${form.nome_agente || 'ARIA'}, ${form.ruolo_agente || 'assistente AI'} per "${business?.nome}".

TONO: ${form.tono} | LINGUA: ${form.lingua}

SERVIZI:
${form.servizi || 'Non specificati'}

PREZZI:
${form.prezzi || 'Non specificati'}

NON FARE MAI:
${form.cose_da_non_fare || 'Nessuna restrizione'}

FAQ:
${form.faq || 'Nessuna FAQ'}

ORARI: ${form.orario_inizio}-${form.orario_fine}, giorni: ${(form.giorni_attivi || []).join(', ')}
${form.fuori_orario_attivo ? `FUORI ORARIO: "${form.messaggio_fuori_orario}"` : ''}

SCALA ALL'UMANO QUANDO:
${(form.escalation_rules || []).length > 0 ? form.escalation_rules.join('\n') : 'Mai'}`;

    updateField('ai_prompt', prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(form.ai_prompt);
    toast({ title: t.promptCopied });
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-amber-400 font-medium">{t.advancedArea}</p>
      </div>

      <Accordion type="single" collapsible defaultValue="prompt">
        <AccordionItem value="prompt" className="bg-card border border-border rounded-2xl">
          <AccordionTrigger className="px-5 text-sm font-semibold">
            {t.systemPromptTitle}
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t.quality}: <span className="font-semibold text-foreground">{getQualityLabel()}</span>
              </span>
              {autoSaved && <span className="text-xs text-green-400">{t.ariaUpdated}</span>}
            </div>
            <Textarea
              value={form.ai_prompt}
              onChange={e => updateField('ai_prompt', e.target.value)}
              className="bg-secondary border-border h-72 font-mono text-xs resize-none"
              placeholder={t.promptPlaceholder}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generatePrompt}>
                <RotateCcw className="w-3 h-3 mr-1.5" /> {t.regenerateFromConfig}
              </Button>
              <Button variant="outline" size="sm" onClick={copyPrompt} disabled={!form.ai_prompt}>
                <Copy className="w-3 h-3 mr-1.5" /> {t.copy}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}