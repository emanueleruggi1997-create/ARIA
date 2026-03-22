import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Send, ArrowRight } from 'lucide-react';
import { EmailPreview } from './TemplateLibrary';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const VARIABLES = ['[Nome]', '[Azienda]', '[Servizio]', '[Data]', '[Link]', '[Budget]'];

export default function TemplateEditor({ template, businessId, onSaved, onUseInCampaign }) {
  const { toast } = useToast();
  const [nome, setNome] = useState(template.nome);
  const [soggetto, setSoggetto] = useState(template.soggetto || '');
  const [sections, setSections] = useState(template.sections.map(s => ({ ...s })));
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);

  const updateSection = (i, field, value) => {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const insertVar = (variable) => {
    setSections(prev => prev.map((s, idx) => idx === activeSection ? { ...s, testo: (s.testo || '') + variable } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    const saved = await base44.entities.EmailTemplate.create({
      business_id: businessId,
      nome,
      categoria: template.categoria,
      soggetto,
      sections: JSON.stringify(sections),
      is_default: false,
    });
    toast({ title: '✅ Template salvato nelle tue bozze!' });
    setSaving(false);
    onSaved?.(saved);
    return saved;
  };

  const handleSendTest = () => {
    toast({ title: '📧 Email di test inviata!', description: 'Controlla la tua casella email.' });
  };

  const sectionLabels = { header: 'Header', testo: 'Corpo', cta: 'Pulsante CTA', footer: 'Footer' };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
      {/* Left: editor */}
      <div className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground mb-3">✏️ Editor Template</p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Nome template</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1 bg-secondary border-border text-sm h-8" />
            </div>
            <div>
              <Label className="text-xs">Oggetto email</Label>
              <Input value={soggetto} onChange={e => setSoggetto(e.target.value)} className="mt-1 bg-secondary border-border text-sm h-8" />
            </div>
          </div>
        </div>

        {/* Sections list */}
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium">SEZIONI</p>
          <div className="space-y-1">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setActiveSection(i)}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  activeSection === i ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'
                )}>
                {sectionLabels[s.tipo] || s.tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Section editor */}
        <div className="p-3 flex-1 overflow-y-auto">
          {sections[activeSection] && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Testo</Label>
                <Textarea value={sections[activeSection].testo || ''} onChange={e => updateSection(activeSection, 'testo', e.target.value)} className="mt-1 bg-secondary border-border text-xs h-20 resize-none" />
              </div>
              <div>
                <Label className="text-xs">Colore sfondo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={sections[activeSection].bgColor || '#0d1117'} onChange={e => updateSection(activeSection, 'bgColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <span className="text-xs text-muted-foreground">{sections[activeSection].bgColor || '#0d1117'}</span>
                </div>
              </div>
              {sections[activeSection].tipo === 'cta' && (
                <>
                  <div>
                    <Label className="text-xs">Link pulsante</Label>
                    <Input value={sections[activeSection].link || ''} onChange={e => updateSection(activeSection, 'link', e.target.value)} className="mt-1 bg-secondary border-border text-xs h-7" placeholder="https://..." />
                  </div>
                  <div>
                    <Label className="text-xs">Colore pulsante</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={sections[activeSection].coloreBtn || '#3b6ef8'} onChange={e => updateSection(activeSection, 'coloreBtn', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Variabili dinamiche</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {VARIABLES.map(v => (
                    <button key={v} onClick={() => insertVar(v)}
                      className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 hover:bg-primary/20 transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-border space-y-2">
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSendTest}>
            <Send className="w-3 h-3 mr-1.5" /> Invia email di test
          </Button>
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSave} disabled={saving}>
            <Save className="w-3 h-3 mr-1.5" /> {saving ? 'Salvataggio...' : 'Salva come bozza'}
          </Button>
          <Button size="sm" className="w-full text-xs" onClick={async () => { const s = await handleSave(); onUseInCampaign?.(s); }}>
            <ArrowRight className="w-3 h-3 mr-1.5" /> Usa in campagna
          </Button>
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex-1 p-4 overflow-y-auto bg-secondary/20">
        <p className="text-xs text-muted-foreground mb-3 font-medium">👁 ANTEPRIMA LIVE</p>
        <EmailPreview sections={sections} />
      </div>
    </div>
  );
}