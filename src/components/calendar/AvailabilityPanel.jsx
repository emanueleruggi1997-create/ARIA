import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const GIORNI = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mer', label: 'Mer' },
  { id: 'gio', label: 'Gio' },
  { id: 'ven', label: 'Ven' },
  { id: 'sab', label: 'Sab' },
  { id: 'dom', label: 'Dom' },
];

export default function AvailabilityPanel({ business, onSaved }) {
  const [giorni, setGiorni] = useState(business?.giorni_attivi || ['lun', 'mar', 'mer', 'gio', 'ven']);
  const [orarioInizio, setOrarioInizio] = useState(business?.orario_inizio || '09:00');
  const [orarioFine, setOrarioFine] = useState(business?.orario_fine || '18:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setGiorni(business.giorni_attivi || ['lun', 'mar', 'mer', 'gio', 'ven']);
      setOrarioInizio(business.orario_inizio || '09:00');
      setOrarioFine(business.orario_fine || '18:00');
    }
  }, [business?.id]);

  const toggleGiorno = (id) => {
    setGiorni(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    await base44.entities.Business.update(business.id, {
      giorni_attivi: giorni,
      orario_inizio: orarioInizio,
      orario_fine: orarioFine,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Le mie disponibilità</h3>
        <p className="text-xs text-muted-foreground ml-1">— ARIA le usa per gestire le prenotazioni</p>
      </div>

      {/* Giorni */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Giorni disponibili</p>
        <div className="flex gap-2 flex-wrap">
          {GIORNI.map(g => (
            <button
              key={g.id}
              onClick={() => toggleGiorno(g.id)}
              className={cn(
                'w-10 h-10 rounded-lg text-xs font-semibold transition-all border',
                giorni.includes(g.id)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orari */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Fascia oraria</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Dalle</span>
            <Input
              type="time"
              value={orarioInizio}
              onChange={e => setOrarioInizio(e.target.value)}
              className="w-28 bg-secondary border-border text-sm h-9"
            />
          </div>
          <span className="text-muted-foreground">—</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Alle</span>
            <Input
              type="time"
              value={orarioFine}
              onChange={e => setOrarioFine(e.target.value)}
              className="w-28 bg-secondary border-border text-sm h-9"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
        {saved ? (
          <><Check className="w-4 h-4 mr-1" /> Salvato!</>
        ) : saving ? (
          <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" /> Salvataggio...</>
        ) : (
          <><Save className="w-4 h-4 mr-1" /> Salva disponibilità</>
        )}
      </Button>
    </div>
  );
}