/**
 * MetaConnectionStatus — diagnostica veritiera a 5 livelli.
 *
 * 1. Token & Scopes   — debug_token da Meta (scopes REALI)
 * 2. Profilo account  — chiamata API reale (account_type, username)
 * 3. Webhook fields   — subscribed_apps (fields attivi)
 * 4. Webhook ricevuti — WebhookEventLog
 * 5. Inbox & ARIA     — messaggi salvati
 *
 * Mostra diagnosi automatica con causa e soluzione specifica.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const LEVEL = {
  ok:   { bg: '#10B98110', border: '#10B98140', text: '#10B981', icon: '✅' },
  warn: { bg: '#F59E0B10', border: '#F59E0B40', text: '#F59E0B', icon: '⚠️' },
  err:  { bg: '#EF444410', border: '#EF444440', text: '#EF4444', icon: '❌' },
  info: { bg: '#3B82F610', border: '#3B82F640', text: '#60A5FA', icon: 'ℹ️' },
};

function Row({ level = 'info', title, detail, sub, mono }) {
  const s = LEVEL[level];
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: s.text }}>{title}</div>
        {detail && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, wordBreak: 'break-word' }}>{detail}</div>}
        {sub && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ n, label, status }) {
  const dot = status === 'ok' ? '#10B981' : status === 'err' ? '#EF4444' : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6B7280', marginBottom: 6, marginTop: 12, fontWeight: 700, letterSpacing: 0.5 }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1F2937', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>{n}</span>
      <span style={{ textTransform: 'uppercase' }}>{label}</span>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, marginLeft: 'auto' }} />
    </div>
  );
}

const fmt = (d) => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function MetaConnectionStatus({ connection, businessId }) {
  const [loading, setLoading]     = useState(true);
  const [testing, setTesting]     = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [logs, setLogs]           = useState([]);
  const [messages, setMessages]   = useState([]);
  const [apiResult, setApiResult] = useState(null);
  const [showRaw, setShowRaw]     = useState(false);

  const load = async () => {
    if (!connection?.id || !businessId) { setLoading(false); return; }
    const [wl, msgs] = await Promise.all([
      base44.entities.WebhookEventLog.filter({ connection_id: connection.id }, '-created_date', 5).catch(() => []),
      base44.entities.Message.filter({ business_id: businessId, canale: 'instagram' }, '-created_date', 1).catch(() => []),
    ]);
    setLogs(wl || []);
    setMessages(msgs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [connection?.id, businessId]);

  const runApiTest = async () => {
    if (testing || !connection?.id) return;
    setTesting(true);
    setApiResult(null);
    try {
      const res = await Promise.race([
        base44.functions.invoke('testMetaConnection', { connector_id: connection.id }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 30s')), 30000)),
      ]);
      setApiResult(res.data || {});
    } catch (e) {
      setApiResult({ _error: e.message });
    } finally {
      setTesting(false);
      load();
    }
  };

  const runSubscribe = async () => {
    if (subscribing || !connection?.id) return;
    setSubscribing(true);
    try {
      const res = await base44.functions.invoke('subscribeIGWebhook', { connector_id: connection.id });
      const d = res.data || {};
      setApiResult(prev => prev ? { ...prev, _subscribe_result: d } : { _subscribe_result: d });
      // Refresh test automatico dopo subscribe
      setTimeout(runApiTest, 1000);
    } catch (e) {
      setApiResult(prev => prev ? { ...prev, _subscribe_result: { error: e.message } } : { _subscribe_result: { error: e.message } });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', padding: '8px 0' }}>
      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Caricamento diagnostica...
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── LIVELLO 1: OAuth locale ──
  const tokenOk      = !!connection?.access_token;
  const isError190   = (connection?.sync_error || '').includes('token_expired_190') ||
                       (connection?.refresh_error || '').includes('error_190') ||
                       connection?.status === 'error';
  const basicInDB    = connection?.has_basic_scope === true || (connection?.granted_scopes || '').includes('instagram_business_basic');
  const msgInDB      = connection?.has_messages_scope === true || (connection?.granted_scopes || '').includes('instagram_business_manage_messages');
  const expiryDate   = connection?.ig_token_expires_at ? new Date(connection.ig_token_expires_at) : null;
  const tokenExpired = (expiryDate && expiryDate < new Date()) || isError190;
  const daysLeft     = expiryDate ? Math.round((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const oauthStatus  = (!tokenOk || tokenExpired) ? 'err' : 'ok';

  // ── LIVELLO 2: API result ──
  const apiOk        = apiResult?.success === true;
  const igError      = apiResult?.results?.ig_profile?.error || apiResult?.results?.ig_me?.error;
  const accountType  = apiResult?.account_type || null;
  const isBusiness   = apiResult?.is_business_or_creator === true;
  const realScopes   = apiResult?.real_scopes || [];
  const basicReal    = apiResult?.instagram_business_basic_approved === true;
  const msgReal      = apiResult?.instagram_business_manage_messages_approved === true;
  const tokenDebug   = apiResult?.results?.token_debug;
  const tokenValid   = tokenDebug?.is_valid === true;
  const apiStatus    = apiResult === null ? 'warn' : apiOk ? 'ok' : 'err';

  // ── LIVELLO 3: Webhook fields ──
  const subscribedFields = apiResult?.subscribed_fields || [];
  const hasMessages      = subscribedFields.includes('messages');
  const hasPostbacks     = subscribedFields.includes('messaging_postbacks');
  const missingFields    = apiResult?.missing_fields || [];
  const webhookFieldsOk  = apiResult !== null ? (hasMessages && hasPostbacks) : null;
  const webhookFieldStatus = webhookFieldsOk === null ? 'warn' : webhookFieldsOk ? 'ok' : 'err';

  // ── LIVELLO 4: Webhook ricevuti ──
  const lastDmLog    = logs.find(l => l.event_type === 'dm') || null;
  const lastErrLog   = logs.find(l => l.event_type === 'error') || null;
  const webhookOk    = !!lastDmLog;
  const webhookStatus = webhookOk ? 'ok' : 'warn';

  // ── LIVELLO 5: Inbox ──
  const lastMsg    = messages[0] || null;
  const inboxOk    = !!lastMsg;
  const inboxStatus = inboxOk ? 'ok' : 'warn';

  // Ruolo utente
  const userRole   = apiResult?.user_role_in_app;
  const userRoleOk = apiResult?.user_role_ok;

  // Diagnosi automatica
  const diagnosis  = apiResult?.diagnosis || [];

  const ariaOk = oauthStatus === 'ok' && apiOk && webhookFieldsOk && webhookOk && inboxOk;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#4B5563', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>
        Diagnostica Connessione
      </div>

      {/* ── 1: OAuth & Token ── */}
      <SectionHeader n="1" label="OAuth & Token" status={oauthStatus} />
      {!tokenOk
        ? <Row level="err" title="Token mancante — riconnetti Instagram" />
        : isError190
          ? <Row level="err" title="TOKEN SCADUTO — Error 190 (Session has expired)" detail="Riconnetti Instagram tramite OAuth completo." sub={connection?.refresh_error} mono />
          : tokenExpired
            ? <Row level="err" title="Token SCADUTO" detail={`Scaduto il ${fmt(expiryDate)} — riconnetti`} />
            : <Row level="ok" title="Token presente e non scaduto" detail={daysLeft !== null ? `Scade tra ${daysLeft} giorni (${fmt(expiryDate)})` : 'Scadenza non registrata'} />
      }
      <Row level={basicInDB ? 'info' : 'warn'} title={`instagram_business_basic in DB: ${basicInDB ? 'sì' : 'NON salvato'}`} detail="Valore DB — verifica con Test API per scopes REALI approvati da Meta" />
      <Row level={msgInDB ? 'info' : 'warn'} title={`instagram_business_manage_messages in DB: ${msgInDB ? 'sì' : 'NON salvato'}`} />

      {/* ── 2: Test API ── */}
      <SectionHeader n="2" label="Test API Meta (reale)" status={apiStatus} />

      {apiResult === null && !testing && (
        <div style={{ padding: '12px', background: '#1F293780', border: '1px solid #374151', borderRadius: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Esegui il test per verificare: profilo IG, tipo account, scopes reali, webhook fields, ruolo utente nell'app Meta.
          </div>
          <button onClick={runApiTest} style={{ background: '#3B82F620', border: '1px solid #3B82F640', borderRadius: 8, padding: '7px 14px', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🧪 Esegui Diagnostica Completa
          </button>
        </div>
      )}

      {testing && <Row level="info" title="Diagnostica in corso... (10-30s)" detail="Eseguendo 7 test API su Meta" />}

      {apiResult !== null && !testing && (
        <>
          {apiResult._error && <Row level="err" title="Errore durante il test" detail={apiResult._error} />}

          {!apiResult._error && (
            <>
              {/* Profilo */}
              {apiOk ? (
                <Row level="ok"
                  title={`Profilo OK — @${apiResult.account_name} · ${accountType}`}
                  detail={isBusiness ? 'Account BUSINESS/CREATOR — compatibile con Instagram Business Login' : `⚠️ Account type ${accountType} — solo BUSINESS/CREATOR supportano le Messaging API`}
                />
              ) : (
                <Row level="err"
                  title={`Profilo FALLITO — Error ${igError?.code || '?'}`}
                  detail={igError?.message}
                  sub={`fbtrace_id: ${igError?.fbtrace_id || '?'}`}
                />
              )}

              {/* Account type */}
              {accountType && !isBusiness && (
                <Row level="err"
                  title={`Account type: ${accountType} — NON compatibile`}
                  detail="Solo account BUSINESS o CREATOR su Instagram supportano le API Messaging. Vai su Instagram → Impostazioni → Account → Passa ad account professionale."
                />
              )}

              {/* Token debug */}
              {tokenDebug && !tokenDebug.skipped && (
                <>
                  <Row
                    level={tokenValid ? 'ok' : 'err'}
                    title={`Token ${tokenValid ? 'VALIDO' : 'NON VALIDO'} secondo Meta debug_token`}
                    detail={`Token type: ${tokenDebug.type || '?'} · Meta user_id: ${tokenDebug.user_id || '?'} · App: ${tokenDebug.app_id || '?'}`}
                  />
                  <Row
                    level={basicReal ? 'ok' : 'err'}
                    title={`instagram_business_basic: ${basicReal ? '✅ APPROVATO DA META' : '❌ NON approvato'}`}
                    detail={basicReal ? undefined : 'Causa più comune di error 100. Vai su Meta App Dashboard → App Review → Permissions → instagram_business_basic → richiedi approvazione avanzata.'}
                  />
                  <Row
                    level={msgReal ? 'ok' : 'err'}
                    title={`instagram_business_manage_messages: ${msgReal ? '✅ APPROVATO' : '❌ NON approvato'}`}
                  />
                  {realScopes.length > 0 && (
                    <Row level="info" title="Scopes reali nel token" detail={realScopes.join(', ')} />
                  )}
                </>
              )}

              {/* FB me cross-check */}
              {apiResult.results?.fb_me?.success && (
                <Row level="warn"
                  title="⚠️ Token funziona su graph.facebook.com/me"
                  detail="Il token potrebbe essere un Facebook User Token invece di un Instagram Business Login token. Verifica che startMetaOAuth usi api.instagram.com/oauth/authorize."
                />
              )}

              {/* App Role */}
              {apiResult.user_role_in_app !== undefined && (
                <Row
                  level={userRoleOk ? 'ok' : 'warn'}
                  title={`Ruolo utente nell'app Meta: ${userRole || 'NON trovato'}`}
                  detail={userRoleOk
                    ? 'Utente autorizzato come Developer/Admin/Tester'
                    : 'L\'utente non è tra i ruoli dell\'app. In modalità sviluppo, aggiungilo come Tester su Meta App Dashboard → Roles.'}
                />
              )}

              {/* Webhook fields */}
              <div style={{ marginTop: 6 }}>
                <Row
                  level={webhookFieldsOk ? 'ok' : 'err'}
                  title={webhookFieldsOk
                    ? `Webhook fields attivi: ${subscribedFields.join(', ')}`
                    : `Webhook fields MANCANTI: ${missingFields.join(', ')}`}
                  detail={webhookFieldsOk
                    ? undefined
                    : 'Senza "messages" e "messaging_postbacks" attivi, Meta non invia eventi DM.'}
                />
                {!webhookFieldsOk && (
                  <button
                    onClick={runSubscribe}
                    disabled={subscribing}
                    style={{ background: '#F59E0B20', border: '1px solid #F59E0B40', borderRadius: 8, padding: '6px 12px', color: '#F59E0B', fontSize: 11, fontWeight: 700, cursor: subscribing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 4 }}
                  >
                    {subscribing ? '⏳ Sottoscrizione...' : '🔔 Sottoscrivi webhook fields ora'}
                  </button>
                )}
              </div>

              {/* Subscribe result */}
              {apiResult._subscribe_result && (
                <Row
                  level={apiResult._subscribe_result.success ? 'ok' : 'err'}
                  title={apiResult._subscribe_result.success
                    ? `✅ Webhook sottoscritto — method: ${apiResult._subscribe_result.method_used}`
                    : `❌ Sottoscrizione fallita: ${apiResult._subscribe_result.error}`}
                />
              )}

              {/* Diagnosis automatica */}
              {diagnosis.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Diagnosi automatica</div>
                  {diagnosis.map((d, i) => (
                    <Row key={i} level={d.level === 'ok' ? 'ok' : d.level === 'warn' ? 'warn' : 'err'} title={d.msg} />
                  ))}
                </div>
              )}

              {/* Raw toggle */}
              <button onClick={() => setShowRaw(v => !v)} style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', fontFamily: 'inherit' }}>
                {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRaw ? 'Nascondi' : 'Mostra'} risposta raw Meta
              </button>
              {showRaw && (
                <pre style={{ fontSize: 10, color: '#6B7280', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 10, overflow: 'auto', maxHeight: 300, marginBottom: 8 }}>
                  {JSON.stringify(apiResult.results, null, 2)}
                </pre>
              )}

              {/* Re-run */}
              <button onClick={runApiTest} style={{ background: '#1F293780', border: '1px solid #374151', borderRadius: 8, padding: '5px 12px', color: '#6B7280', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <RefreshCw size={11} /> Ripeti diagnostica
              </button>
            </>
          )}
        </>
      )}

      {/* ── 3: Webhook fields ── */}
      <SectionHeader n="3" label="Webhook Fields (subscribed_apps)" status={webhookFieldStatus} />
      {apiResult === null ? (
        <Row level="warn" title="Non ancora verificato — esegui Test API" />
      ) : webhookFieldsOk ? (
        <Row level="ok" title={`Fields attivi: ${subscribedFields.join(', ')}`} detail="Meta invierà eventi DM a questo account" />
      ) : (
        <Row level="err"
          title={`Fields mancanti: ${missingFields.join(', ')}`}
          detail="Meta NON invia eventi. Clicca 'Sottoscrivi webhook fields ora' sopra."
        />
      )}

      {/* ── 4: Webhook DM ricevuti ── */}
      <SectionHeader n="4" label="Webhook Meta → DM ricevuti" status={webhookStatus} />
      {logs.length === 0 ? (
        <Row level="warn"
          title="Nessun webhook ricevuto per questa connessione"
          detail="Verifica nel Meta App Dashboard: Webhooks → Instagram → url endpoint e verify token. Poi invia un DM di test da un account tester."
        />
      ) : !webhookOk ? (
        <Row level="warn"
          title={`${logs.length} webhook ricevuti ma nessun DM`}
          detail={`Tipo: ${logs[0]?.event_type} · ${fmt(logs[0]?.created_date)}`}
          sub={logs[0]?.raw_payload?.slice(0, 300)} mono
        />
      ) : (
        <Row level="ok"
          title="Webhook DM ricevuto e processato"
          detail={`Ultimo: ${fmt(lastDmLog?.created_date)} · sender: ${lastDmLog?.sender_id || '?'} → recipient: ${lastDmLog?.recipient_id || '?'} · matched: ${lastDmLog?.matched_connection ? 'sì' : 'NO'}`}
        />
      )}
      {lastErrLog && <Row level="err" title="Errore webhook" detail={lastErrLog.processing_error} sub={lastErrLog.raw_payload?.slice(0, 200)} mono />}

      {/* ── 5: Inbox & ARIA ── */}
      <SectionHeader n="5" label="Inbox & ARIA" status={inboxStatus} />
      {!inboxOk ? (
        <Row level="warn" title="Nessun messaggio Instagram in Inbox" detail="ARIA è considerata operativa SOLO quando almeno un DM reale appare in Inbox." />
      ) : (
        <Row level="ok" title="Messaggi Instagram presenti" detail={`Ultimo: ${fmt(lastMsg?.created_date)} · ruolo: ${lastMsg?.ruolo}`} />
      )}

      {/* ── Guida Fix — mostrata solo se ci sono errori ── */}
      {apiResult !== null && diagnosis.filter(d => d.level === 'error').length > 0 && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#0F172A', border: '1px solid #F59E0B40', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: '#F59E0B', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            🔧 Guida alla Risoluzione
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Error 100 / scopes non approvati */}
            {(!apiResult.instagram_business_basic_approved) && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#EF4444' }}>CAUSA PRINCIPALE — Error 100: instagram_business_basic non approvato</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Vai su <strong style={{ color: '#60A5FA' }}>Meta App Dashboard → App Review → Permissions</strong></li>
                  <li>Trova <code style={{ color: '#F59E0B', fontSize: 10 }}>instagram_business_basic</code> → clicca <strong>Request Advanced Access</strong></li>
                  <li>Trova <code style={{ color: '#F59E0B', fontSize: 10 }}>instagram_business_manage_messages</code> → stessa cosa</li>
                  <li><strong>In attesa di approvazione?</strong> → aggiungi il tuo account IG come <strong>Tester</strong> in App Dashboard → Roles → Add Testers</li>
                  <li>Dopo aver aggiunto il Tester → <strong>Riconnetti OAuth</strong> → ripeti diagnostica</li>
                </ol>
              </div>
            )}

            {/* Account non Business */}
            {apiResult.account_type && !apiResult.is_business_or_creator && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#EF4444' }}>Account Instagram non è Business/Creator</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Apri Instagram → <strong>Impostazioni → Account</strong></li>
                  <li>Clicca <strong>"Passa ad account professionale"</strong></li>
                  <li>Scegli <strong>Business</strong> (non Creator se vuoi le API Messaging)</li>
                  <li>Collega a una <strong>Facebook Page</strong> quando richiesto</li>
                  <li>Dopo → <strong>Riconnetti OAuth</strong></li>
                </ol>
              </div>
            )}

            {/* Webhook fields mancanti */}
            {apiResult.missing_fields?.length > 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#F59E0B' }}>Webhook fields non attivi → Meta non invia DM</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Opzione A: clicca <strong>"Sottoscrivi webhook fields ora"</strong> (sopra)</li>
                  <li>Opzione B: vai su <strong>Meta App Dashboard → Webhooks → Instagram</strong></li>
                  <li>Verifica che <code style={{ color: '#F59E0B', fontSize: 10 }}>messages</code> e <code style={{ color: '#F59E0B', fontSize: 10 }}>messaging_postbacks</code> siano abilitati</li>
                  <li>Verifica che il <strong>Callback URL</strong> punti al tuo endpoint webhook e che il <strong>Verify Token</strong> sia <code style={{ color: '#F59E0B', fontSize: 10 }}>emaral2026</code></li>
                </ol>
              </div>
            )}

            {/* Utente non Tester */}
            {apiResult.user_role_in_app !== undefined && !apiResult.user_role_ok && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#F59E0B' }}>Utente non è Tester/Developer dell'app Meta</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Vai su <strong>Meta App Dashboard → Roles → Testers</strong></li>
                  <li>Clicca <strong>Add Testers</strong> → inserisci il nome utente IG/FB dell'account che fa il test</li>
                  <li>L'utente deve <strong>accettare l'invito</strong> (controlla le notifiche IG/FB)</li>
                  <li>Dopo accettazione → invia DM di test e ricontrolla qui</li>
                </ol>
              </div>
            )}

            {/* Zero webhook */}
            {apiResult.recent_webhooks_count === 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#3B82F610', border: '1px solid #3B82F630', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#60A5FA' }}>Test DM da account Tester</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Da un account IG aggiunto come <strong>Tester</strong>, invia un DM all'account business</li>
                  <li>Attendi 5-10 secondi → clicca <strong>"Ripeti diagnostica"</strong></li>
                  <li>Se appare in "Webhook DM ricevuti" → il sistema funziona</li>
                  <li>Se ancora zero → controlla il Callback URL nel Meta App Dashboard</li>
                  <li>URL webhook attuale: <code style={{ color: '#60A5FA', fontSize: 10, wordBreak: 'break-all' }}>https://emaral-smart-flow.base44.app/api/functions/webhookMeta</code></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sintesi finale ── */}
      <div style={{ marginTop: 10, padding: '10px 14px', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, fontSize: 11 }}>
        <div style={{ fontWeight: 800, color: '#9CA3AF', marginBottom: 6, letterSpacing: 0.5 }}>STATO REALE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          {[
            { label: 'OAuth',            ok: oauthStatus === 'ok' },
            { label: 'API & Scopes',     ok: apiOk,           unknown: apiResult === null },
            { label: 'Account type OK',  ok: isBusiness,      unknown: apiResult === null },
            { label: 'Webhook fields',   ok: webhookFieldsOk, unknown: apiResult === null },
            { label: 'Webhook DM',       ok: webhookOk },
            { label: 'Inbox & ARIA',     ok: inboxOk },
          ].map(({ label, ok, unknown }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>{unknown ? '❓' : ok ? '✅' : '❌'}</span>
              <span style={{ color: unknown ? '#6B7280' : ok ? '#10B981' : '#EF4444', fontWeight: 600 }}>{label}</span>
              {unknown && <span style={{ color: '#4B5563', fontSize: 10 }}>(non testato)</span>}
            </div>
          ))}
        </div>
        {!ariaOk && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#EF4444', background: '#EF444410', border: '1px solid #EF444420', borderRadius: 6, padding: '5px 8px' }}>
            ⚠️ ARIA non è operativa finché tutti i livelli non sono ✅
          </div>
        )}
        {ariaOk && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#10B981', background: '#10B98110', border: '1px solid #10B98120', borderRadius: 6, padding: '5px 8px' }}>
            ✅ Tutti i livelli OK — ARIA operativa
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}