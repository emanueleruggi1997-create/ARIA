import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CANALI = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'web', label: '🌐 Web' },
  { value: 'manual', label: '✏️ Manuale' },
  { value: 'csv', label: '📄 CSV' },
];

const STATI = [
  { value: 'nuovo', label: 'Nuovo' },
  { value: 'contattato', label: 'Contattato' },
  { value: 'qualificato', label: 'Qualificato' },
  { value: 'preventivo_inviato', label: 'Preventivo inviato' },
  { value: 'chiuso_vinto', label: 'Chiuso vinto' },
  { value: 'chiuso_perso', label: 'Chiuso perso' },
];

const EMPTY = {
  nome: '', cognome: '', email: '', phone: '',
  instagram_username: '', azienda: '',
  canale: 'manual', stato: 'nuovo',
  tipo_progetto: '', note: '',
  data_primo_contatto: new Date().toISOString().split('T')[0],
};

export default function LeadFormModal({ open, onClose, onSave, initialData, saving }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (initialData) {
      setForm({
        nome: initialData.nome || initialData.contact_nome?.split(' ')[0] || '',
        cognome: initialData.cognome || (initialData.contact_nome?.split(' ').slice(1).join(' ')) || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        instagram_username: initialData.instagram_username || '',
        azienda: initialData.azienda || '',
        canale: initialData.canale || 'manual',
        stato: initialData.stato || 'nuovo',
        tipo_progetto: initialData.tipo_progetto || '',
        note: initialData.note || initialData.note_ai || '',
        data_primo_contatto: initialData.data_primo_contatto || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm(EMPTY);
    }
  }, [initialData, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const canSave = form.nome.trim();

  const handleSubmit = () => {
    if (!canSave || saving) return;
    onSave({
      ...form,
      contact_nome: `${form.nome} ${form.cognome}`.trim(),
    });
  };

  const C = {
    card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
    accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  };

  const inputStyle = {
    width: '100%', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  const sectionTitle = (label) => (
    <div style={{
      fontSize: 10, fontWeight: 800, color: C.muted,
      textTransform: 'uppercase', letterSpacing: 1,
      borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 12,
    }}>{label}</div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Modifica Lead' : 'Nuovo Lead'}</DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>

          {/* Dati personali */}
          <div>
            {sectionTitle('Dati personali')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Nome *</Label>
                <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Mario" style={inputStyle} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Cognome</Label>
                <input value={form.cognome} onChange={e => set('cognome', e.target.value)} placeholder="Rossi" style={inputStyle} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Azienda</Label>
                <input value={form.azienda} onChange={e => set('azienda', e.target.value)} placeholder="Azienda SRL" style={inputStyle} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Data primo contatto</Label>
                <input type="date" value={form.data_primo_contatto} onChange={e => set('data_primo_contatto', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div>
            {sectionTitle('Contatti')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@esempio.com" style={inputStyle} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Telefono / WhatsApp</Label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 333 123 4567" style={inputStyle} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Instagram</Label>
                <input value={form.instagram_username} onChange={e => set('instagram_username', e.target.value)} placeholder="@username" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Info commerciali */}
          <div>
            {sectionTitle('Info commerciali')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Fonte</Label>
                <Select value={form.canale} onValueChange={v => set('canale', v)}>
                  <SelectTrigger className="bg-secondary border-border h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANALI.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Stato</Label>
                <Select value={form.stato} onValueChange={v => set('stato', v)}>
                  <SelectTrigger className="bg-secondary border-border h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label className="text-xs text-muted-foreground mb-1 block">Servizio / Progetto</Label>
                <input value={form.tipo_progetto} onChange={e => set('tipo_progetto', e.target.value)} placeholder="Es. Consulenza, Corso..." style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label className="text-xs text-muted-foreground mb-1 block">Note</Label>
                <textarea
                  value={form.note}
                  onChange={e => set('note', e.target.value)}
                  rows={3}
                  placeholder="Note aggiuntive sul lead..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!canSave || saving} className="w-full">
            {saving ? 'Salvataggio...' : initialData ? 'Salva modifiche' : 'Crea Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}