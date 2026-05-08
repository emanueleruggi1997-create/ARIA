/**
 * MetaConnectionStatus — diagnostica a 6 livelli con stato OPERATIVO reale.
 *
 * Stato "operativo" SOLO se:
 * 1. OAuth & Token OK
 * 2. API Meta risponde (profilo, scopes reali)
 * 3. Webhook fields sottoscritti
 * 4. Webhook DM reale ricevuto e processato
 * 5. DM salvato in Inbox
 * (6. ARIA risponde — verificato implicitamente se 4+5 ok)
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
  const [loading, setLoading]         = useState(true);
  const [testing, setTesting]         = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [logs, setLogs]               = useState([]);
  const [messages, setMessages]       = useState([]);
  const [apiResult, setApiResult]     = useState(null);
  const [showRaw, setShowRaw]         = useState(false);

  const load = async () => {
    if (!connection?.id || !businessId) { setLoading(false); return; }
    const [wl, msgs] = await Promise.all([
      base44.entities.WebhookEventLog.filter({ connection_id: connection.id }, '-created_date', 10).catch(() => []),
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
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 45s')), 45000)),
      ]);
      setApiResult(res.data || {});
      load();
    } catch (e) {
      setApiResult({ _error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const runSubscribe = async () => {
    if (subscribing || !connection?.id) return;
    setSubscribing(true);
    try {
      const res = await base44.functions.invoke('subscribeIGWebhook', { connector_id: connection.id });
      const d = res.data || {};
      setApiResult(prev => prev ? { ...prev, _subscribe_result: d } : { _subscribe_result: d });
      setTimeout(runApiTest, 1200);
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

  // ── Livello 1: OAuth locale ──
  const tokenOk      = !!connection?.access_token;
  const isError190   = (connection?.sync_error || '').includes('token_expired_190') || connection?.status === 'error';
  const expiryDate   = connection?.ig_token_expires_at ? new Date(connection.ig_token_expires_at) : null;
  const tokenExpired = (expiryDate && expiryDate < new Date()) || isError190;
  const daysLeft     = expiryDate ? Math.round((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const oauthStatus  = (!tokenOk || tokenExpired) ? 'err' : 'ok';

  // ── Livello 2: API result ──
  const apiOk           = apiResult?.success === true;
  const igError         = apiResult?.results?.ig_profile?.error || apiResult?.results?.ig_me?.error;
  const accountType     = apiResult?.account_type || null;
  const isBusiness      = apiResult?.is_business_or_creator === true;
  const realScopes      = apiResult?.real_scopes || [];
  const basicReal       = apiResult?.instagram_business_basic_approved === true;
  const msgReal         = apiResult?.instagram_business_manage_messages_approved === true;
  const tokenDebug      = apiResult?.results?.token_debug;
  const tokenValid      = tokenDebug?.is_valid === true;
  const apiStatus       = apiResult === null ? 'warn' : apiOk ? 'ok' : 'err';
  const fbPageLinked    = apiResult?.fb_page_linked;
  const fbPageName      = apiResult?.fb_page_name;
  const userIsPageAdmin = apiResult?.user_is_page_admin;
  const userRole        = apiResult?.user_role_in_app;
  const userRoleOk      = apiResult?.user_role_ok;
  const sendEpOk        = apiResult?.send_endpoint_ok;
  const sendEpErrCode   = apiResult?.send_endpoint_error_code;

  // ── Livello 3: Webhook fields ──
  const subscribedFields   = apiResult?.subscribed_fields || [];
  const missingFields      = apiResult?.missing_fields || [];
  const webhookFieldsOk    = apiResult !== null ? (subscribedFields.includes('messages') && subscribedFields.includes('messaging_postbacks')) : null;
  const webhookFieldStatus = webhookFieldsOk === null ? 'warn' : webhookFieldsOk ? 'ok' : 'err';

  // ── Livello 4: Webhook DM reali ──
  const allDmLogs       = logs.filter(l => l.event_type === 'dm');
  const lastDmLog       = allDmLogs[0] || null;
  const processedDmLogs = allDmLogs.filter(l => l.processed);
  const webhookOk       = processedDmLogs.length > 0;
  const webhookStatus   = webhookOk ? 'ok' : allDmLogs.length > 0 ? 'warn' : 'warn';

  // ── Livello 5: Inbox ──
  const lastMsg    = messages[0] || null;
  const inboxOk    = !!lastMsg;
  const inboxStatus = inboxOk ? 'ok' : 'warn';

  // ── Diagnosi ──
  const diagnosis = apiResult?.diagnosis || [];

  // STATO OPERATIVO REALE — solo se webhook DM processato E Inbox popolata
  const isOperative = apiResult?.is_operative === true;

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
          ? <Row level="err" title="TOKEN SCADUTO — Error 190" detail="Riconnetti tramite OAuth completo." sub={connection?.sync_error} mono />
          : tokenExpired
            ? <Row level="err" title="Token SCADUTO" detail={`Scaduto il ${fmt(expiryDate)} — riconnetti`} />
            : <Row level="ok" title="Token presente e valido" detail={daysLeft !== null ? `Scade tra ${daysLeft} giorni (${fmt(expiryDate)})` : 'Scadenza non registrata'} />
      }

      {/* ── 2: Test API ── */}
      <SectionHeader n="2" label="Test API Meta (reale)" status={apiStatus} />

      {apiResult === null && !testing && (
        <div style={{ padding: '12px', background: '#1F293780', border: '1px solid #374151', borderRadius: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Verifica: profilo IG, tipo account, scopes reali, FB Page collegata, Admin, ruolo app, endpoint DM.
          </div>
          <button onClick={runApiTest} style={{ background: '#3B82F620', border: '1px solid #3B82F640', borderRadius: 8, padding: '7px 14px', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🧪 Esegui Diagnostica Completa
          </button>
        </div>
      )}

      {testing && <Row level="info" title="Diagnostica in corso... (20-45s)" detail="Eseguendo 10 test API su Meta — attendere" />}

      {apiResult !== null && !testing && (
        <>
          {apiResult._error && <Row level="err" title="Errore durante il test" detail={apiResult._error} />}

          {!apiResult._error && (
            <>
              {/* Profilo */}
              {apiOk ? (
                <Row level="ok"
                  title={`Profilo OK — @${apiResult.account_name} · ${accountType}`}
                  detail={isBusiness ? 'Account BUSINESS/CREATOR — compatibile con IG Business Login' : `⚠️ Account type ${accountType} — serve BUSINESS o CREATOR`}
                />
              ) : (
                <Row level="err"
                  title={`Profilo FALLITO — Error ${igError?.code || '?'}`}
                  detail={igError?.message}
                  sub={`fbtrace_id: ${igError?.fbtrace_id || '?'}`}
                />
              )}

              {/* Account type non business */}
              {accountType && !isBusiness && (
                <Row level="err"
                  title={`Account type: ${accountType} — NON compatibile`}
                  detail="Vai su Instagram → Impostazioni → Account → Passa ad account professionale → Business."
                />
              )}

              {/* Token debug */}
              {tokenDebug && !tokenDebug.skipped && (
                <>
                  <Row level={tokenValid ? 'ok' : (tokenDebug.error?.is_transient ? 'warn' : 'err')}
                    title={`Token ${tokenValid ? 'VALIDO' : tokenDebug.error?.is_transient ? 'non verificabile (Meta API down)' : 'NON VALIDO'} — debug_token`}
                    detail={`Type: ${tokenDebug.type || '?'} · Meta user_id: ${tokenDebug.user_id || '?'}`}
                  />
                  <Row level={basicReal ? 'ok' : 'err'}
                    title={`instagram_business_basic: ${basicReal ? '✅ APPROVATO' : '❌ NON approvato'}`}
                    detail={basicReal ? undefined : 'Causa principale di Error 100 — richiedi App Review o aggiungi Tester.'}
                  />
                  <Row level={msgReal ? 'ok' : 'err'}
                    title={`instagram_business_manage_messages: ${msgReal ? '✅ APPROVATO' : '❌ NON approvato'}`}
                  />
                  {realScopes.length > 0 && (
                    <Row level="info" title="Scopes reali nel token" detail={realScopes.join(', ')} />
                  )}
                </>
              )}

              {/* FB cross-check */}
              {apiResult.results?.fb_me?.success && (
                <Row level="warn"
                  title="⚠️ Token risponde su graph.facebook.com/me — tipo token sospetto"
                  detail="Un IG Business Login token NON dovrebbe funzionare su graph.facebook.com. Questo token potrebbe essere un FB User Token. Verifica che startMetaOAuth usi api.instagram.com/oauth/authorize."
                />
              )}

              {/* FB Page */}
              <Row
                level={fbPageLinked ? 'ok' : 'warn'}
                title={fbPageLinked ? `Facebook Page collegata: ${fbPageName}` : 'Nessuna Facebook Page trovata collegata all\'account IG'}
                detail={fbPageLinked ? (userIsPageAdmin ? 'Utente è Admin della Page ✅' : 'Utente NON è Admin della Page — verifica i permessi') : 'L\'account IG deve essere collegato a una FB Page per usare le API Business.'}
              />

              {/* App Role */}
              <Row
                level={userRoleOk ? 'ok' : (userRole ? 'warn' : 'err')}
                title={`Ruolo utente nell'app Meta: ${userRole || 'NON trovato'}`}
                detail={userRoleOk
                  ? 'Utente autorizzato (Developer/Admin/Tester) — può ricevere DM in dev mode'
                  : 'In modalità sviluppo solo Developer/Admin/Tester possono inviare DM. Aggiungi su Meta App Dashboard → Roles.'}
              />

              {/* Send endpoint */}
              {sendEpOk !== undefined && (
                <Row
                  level={sendEpErrCode === 551 ? 'ok' : sendEpErrCode === 100 ? 'err' : sendEpOk ? 'ok' : 'err'}
                  title={sendEpErrCode === 551 ? 'Endpoint invio DM funzionante (error 551 = atteso)' :
                         sendEpErrCode === 100 ? 'Endpoint DM: permessi mancanti (Error 100)' :
                         sendEpOk ? 'Endpoint DM raggiungibile' : `Endpoint DM NON raggiungibile (HTTP ${apiResult.results?.send_message_test?.http_status})`}
                  detail={apiResult.results?.send_message_test?.note}
                />
              )}

              {/* Webhook fields */}
              <div style={{ marginTop: 6 }}>
                <Row
                  level={webhookFieldsOk ? 'ok' : 'err'}
                  title={webhookFieldsOk
                    ? `Webhook fields attivi: ${subscribedFields.join(', ')}`
                    : `Webhook fields MANCANTI: ${missingFields.join(', ')}`}
                  detail={webhookFieldsOk ? undefined : 'Senza "messages" e "messaging_postbacks", Meta non invia DM.'}
                />
                {!webhookFieldsOk && (
                  <button onClick={runSubscribe} disabled={subscribing}
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
                  title={apiResult._subscribe_result.success ? '✅ Webhook fields sottoscritti' : `❌ Sottoscrizione fallita: ${apiResult._subscribe_result.error}`}
                />
              )}

              {/* Diagnosi automatica */}
              {diagnosis.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Diagnosi automatica</div>
                  {diagnosis.map((d, i) => (
                    <Row key={i} level={d.level === 'ok' ? 'ok' : d.level === 'warn' ? 'warn' : 'err'} title={d.msg} />
                  ))}
                </div>
              )}

              {/* Raw */}
              <button onClick={() => setShowRaw(v => !v)} style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', fontFamily: 'inherit' }}>
                {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRaw ? 'Nascondi' : 'Mostra'} risposta raw Meta
              </button>
              {showRaw && (
                <pre style={{ fontSize: 10, color: '#6B7280', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 10, overflow: 'auto', maxHeight: 320, marginBottom: 8 }}>
                  {JSON.stringify(apiResult.results, null, 2)}
                </pre>
              )}

              <button onClick={runApiTest} style={{ background: '#1F293780', border: '1px solid #374151', borderRadius: 8, padding: '5px 12px', color: '#6B7280', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <RefreshCw size={11} /> Ripeti diagnostica
              </button>
            </>
          )}
        </>
      )}

      {/* ── 3: Webhook fields ── */}
      <SectionHeader n="3" label="Webhook Fields" status={webhookFieldStatus} />
      {apiResult === null ? (
        <Row level="warn" title="Non verificato — esegui Test API" />
      ) : webhookFieldsOk ? (
        <Row level="ok" title={`Fields attivi: ${subscribedFields.join(', ')}`} detail="Meta invierà eventi DM a questo account" />
      ) : (
        <Row level="err" title={`Fields mancanti: ${missingFields.join(', ')}`} detail="Meta NON invia eventi DM." />
      )}

      {/* ── 4: Webhook DM reali ── */}
      <SectionHeader n="4" label="Webhook DM reali ricevuti" status={webhookOk ? 'ok' : 'warn'} />
      {logs.length === 0 ? (
        <Row level="warn"
          title="Nessun webhook ricevuto per questa connessione"
          detail="Invia un DM di test da un account Tester verso l'account Business. Se dopo 10s non appare qui → problema Meta/webhook configuration."
        />
      ) : allDmLogs.length === 0 ? (
        <Row level="warn"
          title={`${logs.length} webhook ricevuti ma NESSUN DM`}
          detail={`Tipi: ${[...new Set(logs.map(l => l.event_type))].join(', ')} · Ultimo: ${fmt(logs[0]?.created_date)}`}
          sub={logs[0]?.raw_payload?.slice(0, 400)} mono
        />
      ) : !webhookOk ? (
        <Row level="warn"
          title={`${allDmLogs.length} DM ricevuti ma nessuno processato (matched_connection fallito)`}
          detail={`sender: ${lastDmLog?.sender_id} → recipient: ${lastDmLog?.recipient_id} · ${fmt(lastDmLog?.created_date)}`}
          sub={`matched: ${lastDmLog?.matched_connection} | processed: ${lastDmLog?.processed}`}
        />
      ) : (
        <Row level="ok"
          title={`${processedDmLogs.length} DM processati correttamente`}
          detail={`Ultimo: ${fmt(lastDmLog?.created_date)} · sender: ${lastDmLog?.sender_id} → recipient: ${lastDmLog?.recipient_id}`}
        />
      )}
      {logs.find(l => l.event_type === 'error') && (
        <Row level="err" title="Errore webhook" detail={logs.find(l => l.event_type === 'error')?.processing_error} sub={logs.find(l => l.event_type === 'error')?.raw_payload?.slice(0, 300)} mono />
      )}

      {/* ── 5: Inbox & ARIA ── */}
      <SectionHeader n="5" label="Inbox & ARIA operativa" status={inboxStatus} />
      {!inboxOk ? (
        <Row level="warn" title="Nessun messaggio Instagram in Inbox" detail="ARIA è OPERATIVA solo quando un DM reale appare in Inbox." />
      ) : (
        <Row level="ok" title="Messaggi Instagram presenti in Inbox" detail={`Ultimo: ${fmt(lastMsg?.created_date)} · ruolo: ${lastMsg?.ruolo}`} />
      )}

      {/* ── Guida Fix ── */}
      {diagnosis.filter(d => d.level === 'error').length > 0 && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#0F172A', border: '1px solid #F59E0B40', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: '#F59E0B', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>🔧 Guida alla Risoluzione</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {!basicReal && apiResult && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#EF4444' }}>Error 100 — instagram_business_basic non approvato</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Vai su <strong style={{ color: '#60A5FA' }}>Meta App Dashboard → App Review → Permissions</strong></li>
                  <li>Trova <code style={{ color: '#F59E0B', fontSize: 10 }}>instagram_business_basic</code> → <strong>Request Advanced Access</strong></li>
                  <li>Stessa cosa per <code style={{ color: '#F59E0B', fontSize: 10 }}>instagram_business_manage_messages</code></li>
                  <li>In attesa di approvazione → aggiungi account IG come <strong>Tester</strong>: Meta App → Roles → Add Testers</li>
                  <li>Dopo → <strong>Riconnetti OAuth</strong> → Ripeti diagnostica</li>
                </ol>
              </div>
            )}

            {apiResult?.account_type && !apiResult?.is_business_or_creator && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#EF4444' }}>Account Instagram non è Business/Creator</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Instagram → Impostazioni → Account → <strong>Passa ad account professionale</strong></li>
                  <li>Scegli <strong>Business</strong></li>
                  <li>Collega a una <strong>Facebook Page</strong></li>
                  <li>Dopo → <strong>Riconnetti OAuth</strong></li>
                </ol>
              </div>
            )}

            {apiResult?.missing_fields?.length > 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#F59E0B' }}>Webhook fields non attivi</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Clicca <strong>"Sottoscrivi webhook fields ora"</strong> sopra</li>
                  <li>Oppure: Meta App Dashboard → Webhooks → Instagram → abilita <code style={{ fontSize: 10, color: '#F59E0B' }}>messages</code>, <code style={{ fontSize: 10, color: '#F59E0B' }}>messaging_postbacks</code></li>
                  <li>Verify Token: <code style={{ color: '#F59E0B', fontSize: 10 }}>emaral2026</code></li>
                  <li>Callback URL: <code style={{ color: '#60A5FA', fontSize: 10, wordBreak: 'break-all' }}>https://emaral-smart-flow.base44.app/api/functions/webhookMeta</code></li>
                </ol>
              </div>
            )}

            {apiResult && !userRoleOk && userRole !== undefined && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#F59E0B' }}>Utente non è Tester/Developer dell'app Meta</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Meta App Dashboard → <strong>Roles → Testers → Add Testers</strong></li>
                  <li>Inserisci username IG/FB dell'account che fa il test DM</li>
                  <li>L'utente deve <strong>accettare l'invito</strong> dalle notifiche IG/FB</li>
                  <li>Dopo accettazione → invia DM di test → ricontrolla qui</li>
                </ol>
              </div>
            )}

            {apiResult?.recent_webhooks_count === 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', background: '#3B82F610', border: '1px solid #3B82F630', borderRadius: 8, padding: '8px 10px' }}>
                <strong style={{ color: '#60A5FA' }}>Zero webhook ricevuti — Test DM</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                  <li>Da un account IG <strong>Tester</strong>, invia un DM all'account business</li>
                  <li>Attendi 5-10s → clicca <strong>Ripeti diagnostica</strong></li>
                  <li>Se appare in "Webhook DM ricevuti" → sistema funziona</li>
                  <li>Se ancora zero → controlla Callback URL nel Meta App Dashboard</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stato OPERATIVO REALE ── */}
      <div style={{ marginTop: 10, padding: '12px 14px', background: '#0F172A', border: `1px solid ${isOperative ? '#10B98140' : '#1E293B'}`, borderRadius: 10, fontSize: 11 }}>
        <div style={{ fontWeight: 800, color: isOperative ? '#10B981' : '#9CA3AF', marginBottom: 8, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOperative ? '#10B981' : '#EF4444', boxShadow: isOperative ? '0 0 8px #10B981' : 'none', flexShrink: 0 }} />
          {isOperative ? 'OPERATIVA — ARIA risponde ai DM' : 'NON OPERATIVA — azioni richieste'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
          {[
            { label: 'OAuth & Token',       ok: oauthStatus === 'ok' },
            { label: 'API & Scopes',        ok: apiOk,              unknown: apiResult === null },
            { label: 'Account Business',    ok: isBusiness,         unknown: apiResult === null },
            { label: 'FB Page collegata',   ok: fbPageLinked,       unknown: apiResult === null },
            { label: 'Ruolo Tester/Dev',    ok: userRoleOk,         unknown: apiResult === null },
            { label: 'Webhook fields',      ok: webhookFieldsOk,    unknown: apiResult === null },
            { label: 'Endpoint DM',         ok: sendEpOk || sendEpErrCode === 551, unknown: apiResult === null },
            { label: 'DM reali ricevuti',   ok: webhookOk },
            { label: 'Inbox popolata',      ok: inboxOk },
          ].map(({ label, ok, unknown }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{ fontSize: 11 }}>{unknown ? '❓' : ok ? '✅' : '❌'}</span>
              <span style={{ color: unknown ? '#4B5563' : ok ? '#10B981' : '#EF4444', fontWeight: 600, fontSize: 11 }}>{label}</span>
              {unknown && <span style={{ color: '#374151', fontSize: 10 }}>(non testato)</span>}
            </div>
          ))}
        </div>
        {!isOperative && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#F59E0B', background: '#F59E0B08', border: '1px solid #F59E0B20', borderRadius: 6, padding: '5px 8px' }}>
            ⚠️ ARIA è OPERATIVA solo quando: webhook DM reale ricevuto + DM salvato in Inbox
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}