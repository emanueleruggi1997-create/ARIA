import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Upload, Globe, Mail, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function TabGenerale({ form, setForm, saving, onSave }) {
  const navigate = useNavigate();
  const logoInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);

  const field = (key, label, placeholder, colSpan = '', type = 'text') => (
    <div className={colSpan}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Input
        type={type}
        value={form[key] || ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-secondary border-border"
      />
    </div>
  );

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, email_logo_url: file_url }));
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Informazioni Business */}
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

      {/* Profilo Azienda per Email */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Profilo Azienda — Footer Email</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Questi dati vengono usati automaticamente nel footer di tutte le email marketing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('email_company_name', 'Nome azienda nel footer', 'Es. Emaral Group')}
          {field('email_company_year', 'Anno', 'Es. 2026')}
          {field('email_company_website', 'Sito web', 'https://emaral.it')}
          {field('email_reply_to', 'Email di risposta', 'info@tuaazienda.it', '', 'email')}
        </div>

        {/* Logo upload */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Logo aziendale (per email)</Label>
          <div className="flex items-center gap-3">
            {form.email_logo_url && (
              <img src={form.email_logo_url} alt="Logo" className="h-10 rounded border border-border object-contain bg-secondary px-2" />
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: '1px solid hsl(var(--border))',
                borderRadius: 8, padding: '8px 14px', color: 'hsl(var(--muted-foreground))',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploadingLogo ? 'Caricamento...' : form.email_logo_url ? 'Cambia logo' : 'Carica logo'}
            </button>
            {form.email_logo_url && (
              <button
                onClick={() => setForm(p => ({ ...p, email_logo_url: '' }))}
                style={{ fontSize: 11, color: 'hsl(var(--destructive))', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Rimuovi
              </button>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
        </div>

        {/* Preview footer */}
        <div style={{
          background: '#0D0D0D', borderRadius: 10, padding: '16px 24px', textAlign: 'center',
          border: '1px solid #333',
        }}>
          <p style={{ fontSize: 11, color: '#666', margin: 0, lineHeight: 1.8 }}>
            {form.email_logo_url && (
              <span><img src={form.email_logo_url} alt="" style={{ height: 20, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /></span>
            )}
            <strong style={{ color: '#999' }}>{form.email_company_name || form.nome || 'Nome Azienda'}</strong>
            {' · '}{form.email_company_year || new Date().getFullYear()}<br />
            {form.email_company_website && <><a href={form.email_company_website} style={{ color: '#666', textDecoration: 'none' }}>{form.email_company_website}</a><br /></>}
            Hai ricevuto questa email perché sei nella nostra lista.<br />
            <span style={{ color: '#00E5FF', textDecoration: 'underline', cursor: 'pointer' }}>Disiscriviti</span>
          </p>
        </div>

        <Button onClick={onSave} disabled={saving} variant="outline" className="w-full" style={{ minHeight: 40, borderRadius: 10, fontWeight: 600 }}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salva profilo email
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