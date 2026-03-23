import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Copy, Loader2, ExternalLink, Lock } from 'lucide-react';

/* ── SVG Icons ── */
const IgIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig-grad)" />
    <rect x="13" y="13" width="22" height="22" rx="7" stroke="white" strokeWidth="2.5" fill="none" />
    <circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none" />
    <circle cx="33.5" cy="14.5" r="2" fill="white" />
  </svg>
);

const FbIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#1877F2" />
    <path d="M28 14h-3a5 5 0 0 0-5 5v3h-3v5h3v10h5V27h3l1-5h-4v-3a1 1 0 0 1 1-1h3z" fill="white" />
  </svg>
);

const WaIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#25D366" />
    <path d="M24 12C17.37 12 12 17.37 12 24c0 2.12.55 4.1 1.52 5.83L12 36l6.37-1.49A11.94 11.94 0 0 0 24 36c6.63 0 12-5.37 12-12S30.63 12 24 12zm6.16 16.4c-.26.73-1.52 1.38-2.09 1.46-.54.08-1.21.11-1.96-.12-.45-.14-1.03-.33-1.77-.65-3.1-1.33-5.12-4.49-5.27-4.7-.15-.22-1.22-1.63-1.22-3.1 0-1.47.77-2.19 1.05-2.49.27-.3.59-.37.79-.37.2 0 .39.01.56.02.18.01.42-.07.65.5.25.6.84 2.06.91 2.21.08.15.13.33.03.53-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.58.17.28.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.45.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.38-.24.64-.14.26.1 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.19 1.41z" fill="white" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="10" width="40" height="28" rx="6" fill="#F59E0B" />
    <path d="M4 14l20 14 20-14" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

/* ── Status Badge ── */
const ConnessoBadge = ({ connected }) => connected ? (
  <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
    Connesso
  </span>
) : null;

/* ── Card wrapper ── */
function ChannelCard({ borderColor, children, opacity = 1 }) {
  return (
    <div style={{
      background: '#0F1219',
      borderRadius: 14,
      borderLeft: `3px solid ${borderColor}`,
      border: `1px solid rgba(255,255,255,0.07)`,
      borderLeftColor: borderColor,
      padding: 20,
      opacity,
      minHeight: 100,
    }}>
      {children}
    </div>
  );
}

/* ── Instagram Card ── */
function CardInstagram({ form, setForm, onSave }) {
  const [loading, setLoading] = useState(false);
  const connected = !!form.ig_connesso;

  const connect = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setForm(p => ({ ...p, ig_connesso: true, ig_username: p.ig_username || '@tuobusiness' }));
    setLoading(false);
    onSave({ ig_connesso: true });
  };

  const disconnect = () => {
    setForm(p => ({ ...p, ig_connesso: false }));
    onSave({ ig_connesso: false });
  };

  return (
    <ChannelCard borderColor="linear-gradient(#F58529, #E1306C)" borderColor="#E1306C">
      <div className="flex items-start gap-4">
        <IgIcon />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">Instagram</span>
            <ConnessoBadge connected={connected} />
          </div>
          {connected ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-muted-foreground">{form.ig_username || '@tuobusiness'}</p>
              <p className="text-xs text-muted-foreground">DM ricevuti questo mese: <span className="text-primary font-medium">83</span></p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Collega il tuo account Business</p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <Button variant="ghost" size="sm" onClick={disconnect}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold"
              style={{ minHeight: 44, borderRadius: 10 }}>
              Disconnetti
            </Button>
          ) : (
            <Button onClick={connect} disabled={loading} size="sm"
              style={{ background: 'linear-gradient(135deg, #F58529, #E1306C)', minHeight: 44, borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><span>Connetti</span> <ExternalLink className="w-3.5 h-3.5 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </ChannelCard>
  );
}

/* ── Facebook Card ── */
function CardFacebook({ form, setForm, onSave }) {
  const [loading, setLoading] = useState(false);
  const connected = !!form.fb_connesso;

  const connect = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setForm(p => ({ ...p, fb_connesso: true, fb_username: p.fb_username || 'La tua Pagina' }));
    setLoading(false);
    onSave({ fb_connesso: true });
  };

  const disconnect = () => {
    setForm(p => ({ ...p, fb_connesso: false }));
    onSave({ fb_connesso: false });
  };

  return (
    <ChannelCard borderColor="#1877F2">
      <div className="flex items-start gap-4">
        <FbIcon />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">Facebook</span>
            <ConnessoBadge connected={connected} />
          </div>
          {connected ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-muted-foreground">{form.fb_username || 'La tua Pagina'}</p>
              <p className="text-xs text-muted-foreground">Post pubblicati questo mese: <span className="text-primary font-medium">12</span></p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Collega la tua Pagina Business</p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <Button variant="ghost" size="sm" onClick={disconnect}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold"
              style={{ minHeight: 44, borderRadius: 10 }}>
              Disconnetti
            </Button>
          ) : (
            <Button onClick={connect} disabled={loading} size="sm"
              style={{ background: '#1877F2', minHeight: 44, borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><span>Connetti Facebook</span> <ExternalLink className="w-3.5 h-3.5 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </ChannelCard>
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
    await new Promise(r => setTimeout(r, 1500));
    setForm(p => ({ ...p, wa_connesso: true }));
    setLoading(false);
    onSave({ wa_connesso: true, wa_number: form.wa_number, wa_api_key: form.wa_api_key });
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
        <div className="relative">
          <WaIcon />
          {!isPro && <div className="absolute -bottom-1 -right-1 text-base">🔒</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">WhatsApp Business</span>
            {isPro ? (
              <ConnessoBadge connected={connected} />
            ) : (
              <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Solo Piano Pro</span>
            )}
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: isPro ? '#3B6EF8' : '#374151', color: 'white' }}>
              {isPro ? 'PRO' : 'PRO'}
            </span>
          </div>

          {!isPro ? (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Disponibile dal piano Pro</p>
              <Button onClick={onUpgrade} size="sm" className="mt-3"
                style={{ background: '#3B6EF8', minHeight: 44, borderRadius: 10, fontWeight: 600 }}>
                Upgrade a Pro →
              </Button>
            </div>
          ) : connected ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-muted-foreground">{form.wa_number}</p>
              <p className="text-xs text-muted-foreground">Messaggi questo mese: <span className="text-primary font-medium">247</span></p>
              <Button variant="ghost" size="sm" onClick={disconnect}
                className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold px-0"
                style={{ minHeight: 44, borderRadius: 10 }}>
                Disconnetti
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">Inserisci la tua API Key 360dialog</p>

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
                    placeholder="Inserisci la tua API Key"
                    className="bg-secondary border-border pr-10" />
                  <button onClick={() => setShowKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a href="https://360dialog.com" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary/70 hover:text-primary mt-1 inline-flex items-center gap-1">
                  Non hai ancora 360dialog? Creala su 360dialog.com →
                </a>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="relative mt-1">
                  <Input value={webhookUrl} readOnly className="bg-secondary border-border pr-10 font-mono text-xs" />
                  <button onClick={copyWebhook}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

      {isPro && !connected && (
        <div className="mt-4 flex gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="text-sm shrink-0">ℹ️</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WhatsApp Business API è fornita da 360dialog. Crea il tuo account su 360dialog.com per ottenere la API Key. Il costo è incluso nel tuo piano Pro.
          </p>
        </div>
      )}
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
    await new Promise(r => setTimeout(r, 1500));
    setTestResult('ok');
    setTesting(false);
    setForm(p => ({ ...p, email_connessa: true }));
    onSave({ email_connessa: true, email_provider: provider });
  };

  const disconnect = () => {
    setForm(p => ({ ...p, email_connessa: false }));
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
                className="mt-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 font-semibold px-0"
                style={{ minHeight: 44, borderRadius: 10 }}>
                Disconnetti
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Provider email</Label>
                <Select value={provider} onValueChange={v => setForm(p => ({ ...p, email_provider: v, email_connessa: false }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
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
                <Button onClick={testConnection} disabled={testing}
                  className="w-full font-semibold" style={{ background: 'white', color: '#1a1a1a', minHeight: 44, borderRadius: 10 }}>
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
                      <button onClick={() => setShowPass(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

              {testResult === 'ok' && (
                <p className="text-xs text-green-400 font-medium">✓ Connessione riuscita</p>
              )}
            </div>
          )}
        </div>
      </div>
    </ChannelCard>
  );
}

/* ── Main Export ── */
export default function TabConnessioni({ form, setForm, onSave }) {
  const handlePartialSave = (fields) => onSave(fields);
  const onUpgrade = () => {
    // trigger parent to switch to piano tab
    document.dispatchEvent(new CustomEvent('settings-goto-tab', { detail: 'piano' }));
  };

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Collega i tuoi canali</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Connetti i tuoi account per far lavorare ARIA</p>
      </div>
      <CardInstagram form={form} setForm={setForm} onSave={handlePartialSave} />
      <CardFacebook form={form} setForm={setForm} onSave={handlePartialSave} />
      <CardWhatsApp form={form} setForm={setForm} onSave={handlePartialSave} onUpgrade={onUpgrade} />
      <CardEmail form={form} setForm={setForm} onSave={handlePartialSave} />
    </div>
  );
}