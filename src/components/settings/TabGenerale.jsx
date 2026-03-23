import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TabGenerale({ form, setForm, saving, onSave }) {
  const navigate = useNavigate();

  const field = (key, label, placeholder, colSpan = '') => (
    <div className={colSpan}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Input
        value={form[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-secondary border-border"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Informazioni Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('nome', 'Nome Business *', 'Es. Salone Rosa')}
          {field('settore', 'Settore', 'Es. Estetica, Ristorante...')}
          {field('citta', 'Città', 'Es. Milano')}
          {field('telefono', 'Telefono', '+39 333 123 4567')}
          {field('sito_web', 'Sito web', 'https://tuosito.it', 'md:col-span-2')}
          {field('piva', 'P.IVA (opzionale)', 'IT12345678901', 'md:col-span-2')}
        </div>
        <Button onClick={onSave} disabled={saving} className="w-full" style={{ minHeight: 44, borderRadius: 10, fontWeight: 600 }}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salva impostazioni
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/system-check')}>
          🔧 System Check — verifica funzionamento
        </Button>
      </div>
    </div>
  );
}