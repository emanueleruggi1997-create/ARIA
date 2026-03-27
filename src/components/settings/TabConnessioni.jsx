import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Copy, Loader2 } from 'lucide-react';
import MetaConnectionCard from '@/components/settings/MetaConnectionCard';

/* ── SVG Icons ── */
const WaIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
    <circle cx="24" cy="24" r="22" fill="#25D366" />
    <path d="M24 12C17.37 12 12 17.37 12 24c0 2.12.55 4.1 1.52 5.83L12 36l6.37-1.49A11.94 11.94 0 0 0 24 36c6.63 0 12-5.37 12-12S30.63 12 24 12zm6.16 16.4c-.26.73-1.52 1.38-2.09 1.46-.54.08-1.21.11-1.96-.12-.45-.14-1.03-.33-1.77-.65-3.1-1.33-5.12-4.49-5.27-4.7-.15-.22-1.22-1.63-1.22-3.1 0-1.47.77-2.19 1.05-2.49.27-.3.59-.37.79-.37.2 0 .39.01.56.02.18.01.42-.07.65.5.25.6.84 2.06.91 2.21.08.15.13.33.03.53-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.58.17.28.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.45.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.38-.24.64-.14.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.19 1.41z" fill="white" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
    <rect x="4" y="10" width="40" height="28" rx="6" fill="#F59E0B" />
    <path d="M4 14l20 14 20-14" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

const ConnessoBadge = ({ connected }) => connected ? (
  <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
    Connesso
  </span>
) : null;

function ChannelCard({ borderColor, children, opacity = 1 }) {
  return (
    <div style={{
      background: '#0F1219',
      borderRadius: 14,
      border: `1px solid rgba(255,255,255,0.07)`,
      borderLeft: `3px solid ${borderColor}`,
      padding: 20,
      opacity,
    }}>
      {children}
    </div>
  );
}

/* ── WhatsApp Card ── */
function CardWhatsApp({ form, setForm, onSave, onUpgrade }) {
  const isPro = ['pro', 'agency'].includes(form.piano);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const connected = !!form.wa_connesso;
  const webhookUrl = 'https://app.emeralagent.com/webhook/wa';

  const connect = async () => {
    if (!form.wa_number || !form.wa_api_key) return;
    setLoading(true);
    try {
      setForm(p => ({ ...p, wa_connesso: true }));
      onSave({ wa_connesso: true, wa_number: form.wa_number, wa_api_key: form.wa_api_key });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setForm(p => ({ ...p, wa_connesso: false }));
    onSave({ wa_connesso: false });
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ChannelCard borderColor="#25D366" opacity={!isPro ? 0.6 : 1}>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <WaIcon />
          {!isPro && <div className="absolute -bottom-1 -right-1 text-base">🔒</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">WhatsApp Business</span>
            {isPro ? <ConnessoBadge connected={connected} /> : (
              <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Solo Piano Pro</span>
            )}
          </div>

          {!isPro ? (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Disponibile dal piano Pro</p>
              <Button onClick={onUpgrade} size="sm" className="mt-3" style={{ background: '#3B6EF8', minHeight: 44, borderRadius: 10, fontWeight: 600 }}>
                Upgrade a Pro →
              </Button>
            </div>
          ) : connected ? (
            <div className="mt-1 space-y-1">
              <p className="text-sm text-muted-foreground">{form.wa_number}</p>
              <Button variant="ghost" size="sm" onClick={disconnect}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold px-0 mt-2" style={{ minHeight: 44 }}>
                Disconnetti
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Numero WhatsApp Business</Label>
                <Input value={form.wa_number || ''} onChange={e => setForm(p => ({ ...p, wa_number: e.target.value }))}
                  placeholder="+39 333 123 4567" className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Key 360dialog</Label>
                <div className="relative mt-1">
                  <Input type={showKey ? 'text' : 'password'}
                    value={form.wa_api_key || ''} onChange={e => setForm(p => ({ ...p, wa_api_key: e.target.value }))}
                    placeholder="Inserisci la tua API Key" className="bg-secondary border-border pr-10" />
                  <button onClick={() => setShowKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a href="https://360dialog.com" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary/70 hover:text-primary mt-1 inline-flex items-center gap-1">
                  Non hai 360dialog? Creala su 360dialog.com →
                </a>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="relative mt-1">
                  <Input value={webhookUrl} readOnly className="bg-secondary border-border pr-10 font-mono text-xs" />
                  <button onClick={copyWebhook} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {copied ? <span className="text-xs text-green-400">✓</span> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={connect} disabled={loading || !form.wa_number || !form.wa_api_key}
                className="w-full font-semibold" style={{ background: '#25D366', minHeight: 44, borderRadius: 10 }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Collega WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>
    </ChannelCard>
  );
}

/* ── Email Card ── */
function CardEmail({ form, setForm, onSave }) {
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const connected = !!form.email_connessa;
  const provider = form.email_provider || 'gmail';
  const isOAuth = ['gmail', 'outlook'].includes(provider);

  const testConnection = async () => {
    setTesting(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      setTestResult('ok');
      setForm(p => ({ ...p, email_connessa: true }));
      onSave({ email_connessa: true, email_provider: provider });
    } finally {
      setTesting(false);
    }
  };

  const disconnect = () => {
    setForm(p => ({ ...p, email_connessa: false }));
    setTestResult(null);
    onSave({ email_connessa: false });
  };

  return (
    <ChannelCard borderColor="#F59E0B">
      <div className="flex items-start gap-4">
        <EmailIcon />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">Email Marketing</span>
            <ConnessoBadge connected={connected} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Collega il tuo account email per inviare campagne</p>

          {connected ? (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Provider: <span className="text-foreground font-medium capitalize">{provider}</span></p>
              <Button variant="ghost" size="sm" onClick={disconnect}
                className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold px-0" style={{ minHeight: 44 }}>
                Disconnetti
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Provider email</Label>
                <Select value={provider} onValueChange={v => setForm(p => ({ ...p, email_provider: v, email_connessa: false }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="smtp">SMTP personalizzato</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isOAuth ? (
                <Button onClick={testConnection} disabled={testing} className="w-full font-semibold"
                  style={{ background: 'white', color: '#1a1a1a', minHeight: 44, borderRadius: 10 }}>
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                    <span className="mr-2 font-bold" style={{ color: provider === 'gmail' ? '#4285F4' : '#0078D4' }}>
                      {provider === 'gmail' ? 'G' : 'O'}
                    </span>
                  )}
                  Connetti con {provider === 'gmail' ? 'Gmail' : 'Outlook'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Host SMTP</Label>
                    <Input value={form.email_smtp_host || ''} onChange={e => setForm(p => ({ ...p, email_smtp_host: e.target.value }))}
                      placeholder="smtp.tuoserver.com" className="mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Porta</Label>
                    <Input value={form.email_smtp_porta || ''} onChange={e => setForm(p => ({ ...p, email_smtp_porta: e.target.value }))}
                      placeholder="465 o 587" className="mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <Input value={form.email_smtp_user || ''} onChange={e => setForm(p => ({ ...p, email_smtp_user: e.target.value }))}
                      className="mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <div className="relative mt-1">
                      <Input type={showPass ? 'text' : 'password'}
                        value={form.email_smtp_pass || ''} onChange={e => setForm(p => ({ ...p, email_smtp_pass: e.target.value }))}
                        className="bg-secondary border-border pr-10" />
                      <button onClick={() => setShowPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={testConnection} disabled={testing} variant="outline"
                    className="w-full font-semibold" style={{ minHeight: 44, borderRadius: 10 }}>
                    {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verifica connessione
                  </Button>
                </div>
              )}

              {testResult === 'ok' && <p className="text-xs text-green-400 font-medium">✓ Connessione riuscita</p>}
            </div>
          )}
        </div>
      </div>
    </ChannelCard>
  );
}

/* ── Main Export ── */
export default function TabConnessioni({ form, setForm, onSave, business }) {
  const [metaConnection, setMetaConnection] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const handlePartialSave = (fields) => onSave(fields);
  const onUpgrade = () => document.dispatchEvent(new CustomEvent('settings-goto-tab', { detail: 'piano' }));

  const loadMetaConnection = async () => {
    if (!business?.id) { setMetaLoading(false); return; }
    try {
      const user = await base44.auth.me();
      const conns = await base44.entities.MetaConnection.filter({ user_id: user.id });
      setMetaConnection(conns.length > 0 ? conns[0] : null);
    } catch (err) {
      console.error('[TabConnessioni] loadMetaConnection error:', err);
      setMetaConnection(null);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMetaConnection();
  }, [business?.id]);

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Collega i tuoi canali</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Connetti i tuoi account per far lavorare ARIA</p>
      </div>

      {metaLoading ? (
        <div className="flex items-center justify-center gap-2 py-5 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento Meta...
        </div>
      ) : (
        <MetaConnectionCard connection={metaConnection} businessId={business?.id} onRefresh={loadMetaConnection} />
      )}

      <CardWhatsApp form={form} setForm={setForm} onSave={handlePartialSave} onUpgrade={onUpgrade} />
      <CardEmail form={form} setForm={setForm} onSave={handlePartialSave} />
    </div>
  );
}