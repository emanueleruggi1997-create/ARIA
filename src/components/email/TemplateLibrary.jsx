import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import TemplateEditor from './TemplateEditor';

const DEFAULT_TEMPLATES = [
  {
    categoria: 'Benvenuto',
    nome: 'Ciao [Nome], benvenuto!',
    emoji: '👋',
    color: 'from-blue-600 to-blue-400',
    sections: [
      { id: 'header', tipo: 'header', testo: 'Benvenuto in [Azienda]! 👋', bgColor: '#1a2744', coloreTestoBtn: '#ffffff' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nsiamo felici di averti con noi. Hai fatto una scelta eccellente!\n\nScopri tutti i nostri servizi e inizia subito.', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Inizia ora', link: '#', coloreBtn: '#3b6ef8', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: 'Benvenuto in [Azienda], [Nome]!',
  },
  {
    categoria: 'Promozione',
    nome: 'Offerta speciale solo per te',
    emoji: '🎁',
    color: 'from-orange-600 to-orange-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '🎁 Offerta Esclusiva per Te!', bgColor: '#2a1a0a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nabbiamo preparato un\'offerta speciale pensata apposta per te.\n\nApprofittane subito — disponibile solo per un periodo limitato!', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Scopri l\'offerta', link: '#', coloreBtn: '#f97316', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: '🎁 Offerta speciale solo per te, [Nome]',
  },
  {
    categoria: 'Promozione',
    nome: 'Sconto 20% — solo questo weekend',
    emoji: '⚡',
    color: 'from-red-600 to-red-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '⚡ -20% SOLO QUESTO WEEKEND', bgColor: '#2a0a0a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nsconto del 20% su tutti i nostri servizi.\n\n⏰ Offerta valida fino a domenica mezzanotte.', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Usa il codice WEEKEND20', link: '#', coloreBtn: '#ef4444', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: '⚡ -20% solo questo weekend!',
  },
  {
    categoria: 'Newsletter',
    nome: 'Le novità di [Mese]',
    emoji: '📰',
    color: 'from-purple-600 to-purple-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '📰 Le novità di [Data]', bgColor: '#1a0a2a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\necco le ultime novità dal team di [Azienda].\n\n• Novità 1\n• Novità 2\n• Novità 3', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Leggi tutto', link: '#', coloreBtn: '#8b5cf6', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: '📰 Le novità di [Azienda] — [Data]',
  },
  {
    categoria: 'Newsletter',
    nome: 'Aggiornamenti dal team',
    emoji: '💼',
    color: 'from-slate-600 to-slate-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '💼 Aggiornamenti dal Team', bgColor: '#1a1f2a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nil team di [Azienda] ha alcune novità importanti da condividere con te.', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Scopri di più', link: '#', coloreBtn: '#64748b', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: 'Aggiornamenti da [Azienda]',
  },
  {
    categoria: 'Follow-up',
    nome: 'Come stai andando con [Servizio]?',
    emoji: '🤝',
    color: 'from-teal-600 to-teal-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '🤝 Come stai andando?', bgColor: '#0a2a1a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nvolevamo sapere come stai andando con [Servizio].\n\nSei soddisfatto? Hai bisogno di supporto?', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Rispondici', link: '#', coloreBtn: '#14b8a6', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: 'Come stai andando con [Servizio]?',
  },
  {
    categoria: 'Follow-up',
    nome: 'Non ti vediamo da un po\'...',
    emoji: '😊',
    color: 'from-yellow-600 to-yellow-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '😊 Ci manchi, [Nome]!', bgColor: '#2a1a0a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nnon ti vediamo da un po\' e volevamo salutarti.\n\nAbbiamo delle novità che potrebbero interessarti!', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Torna a trovarci', link: '#', coloreBtn: '#eab308', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: 'Ci manchi, [Nome]! 😊',
  },
  {
    categoria: 'Commerciale',
    nome: 'Ecco il tuo preventivo personalizzato',
    emoji: '📋',
    color: 'from-indigo-600 to-indigo-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '📋 Il tuo Preventivo Personalizzato', bgColor: '#1a1a2a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\ncome concordato, ti invio il preventivo personalizzato per [Servizio].\n\nBudget stimato: [Budget]\nTempistiche: da definire insieme', bgColor: '#0d1117' },
      { id: 'cta', tipo: 'cta', testo: 'Accetta il preventivo', link: '#', coloreBtn: '#6366f1', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: 'Preventivo personalizzato per [Nome]',
  },
  {
    categoria: 'Transazionale',
    nome: 'Abbiamo ricevuto la tua richiesta',
    emoji: '✅',
    color: 'from-green-600 to-green-400',
    sections: [
      { id: 'header', tipo: 'header', testo: '✅ Richiesta Ricevuta!', bgColor: '#0a2a0a' },
      { id: 'corpo', tipo: 'testo', testo: 'Ciao [Nome],\n\nabbiamo ricevuto la tua richiesta e ti risponderemo entro 24 ore lavorative.\n\nGrazie per aver scelto [Azienda].', bgColor: '#0d1117' },
      { id: 'footer', tipo: 'footer', testo: '© [Azienda] · Disiscriviti', bgColor: '#060810' },
    ],
    soggetto: '✅ Abbiamo ricevuto la tua richiesta',
  },
];

const CATEGORIE = [...new Set(DEFAULT_TEMPLATES.map(t => t.categoria))];

export default function TemplateLibrary({ businessId, onUseInCampaign }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [editMode, setEditMode] = useState(false);

  const filtered = DEFAULT_TEMPLATES.filter(t => !filterCat || t.categoria === filterCat);

  const handleUse = (template) => {
    setSelectedTemplate(template);
    setEditMode(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={cn("px-3 py-1 rounded-lg text-xs font-medium border transition-all",
            !filterCat ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground'
          )}>Tutti</button>
        {CATEGORIE.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={cn("px-3 py-1 rounded-lg text-xs font-medium border transition-all",
              filterCat === c ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground'
            )}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
            {/* Visual preview */}
            <div className={cn("h-32 bg-gradient-to-br flex items-center justify-center relative", t.color)}>
              <div className="text-4xl">{t.emoji}</div>
              <span className="absolute top-2 right-2 text-[10px] font-medium bg-black/30 text-white px-2 py-0.5 rounded-full">{t.categoria}</span>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-foreground mb-1">{t.nome}</p>
              <p className="text-xs text-muted-foreground mb-3 truncate">{t.soggetto}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setPreviewTemplate(t)}>
                  <Eye className="w-3 h-3 mr-1" /> Anteprima
                </Button>
                <Button size="sm" className="flex-1 text-xs h-7" onClick={() => handleUse(t)}>
                  <Pencil className="w-3 h-3 mr-1" /> Usa
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      <Dialog open={!!previewTemplate && !editMode} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          {previewTemplate && <EmailPreview sections={previewTemplate.sections} />}
          <Button className="mt-4 w-full" onClick={() => { setSelectedTemplate(previewTemplate); setEditMode(true); setPreviewTemplate(null); }}>
            Usa questo template
          </Button>
        </DialogContent>
      </Dialog>

      {/* Editor */}
      {editMode && selectedTemplate && (
        <Dialog open={editMode} onOpenChange={() => setEditMode(false)}>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <TemplateEditor
              template={selectedTemplate}
              businessId={businessId}
              onSaved={async (saved) => {
                queryClient.invalidateQueries({ queryKey: ['email-templates'] });
                setEditMode(false);
              }}
              onUseInCampaign={(saved) => {
                setEditMode(false);
                onUseInCampaign?.(saved);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function EmailPreview({ sections }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border font-sans text-sm">
      {(sections || []).map((s, i) => {
        if (s.tipo === 'header') return (
          <div key={i} style={{ background: s.bgColor || '#1a2744', padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '18px', margin: 0 }}>{s.testo}</p>
            {s.imageUrl && <img src={s.imageUrl} alt="" style={{ maxWidth: '100%', marginTop: '12px', borderRadius: '8px' }} />}
          </div>
        );
        if (s.tipo === 'testo') return (
          <div key={i} style={{ background: s.bgColor || '#0d1117', padding: '20px', color: '#c9d1d9' }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{s.testo}</p>
          </div>
        );
        if (s.tipo === 'cta') return (
          <div key={i} style={{ background: s.bgColor || '#0d1117', padding: '16px 20px', textAlign: 'center' }}>
            <a href={s.link || '#'} style={{ display: 'inline-block', background: s.coloreBtn || '#3b6ef8', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>{s.testo}</a>
          </div>
        );
        if (s.tipo === 'footer') return (
          <div key={i} style={{ background: s.bgColor || '#060810', padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>{s.testo}</p>
          </div>
        );
        return null;
      })}
    </div>
  );
}