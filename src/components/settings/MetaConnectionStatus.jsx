/**
 * MetaConnectionStatus — diagnostica veritiera a 4 livelli.
 *
 * 1. OAuth & Token   — dati locali in DB (token, scopes salvati)
 * 2. API Call Meta   — chiamata reale a graph.instagram.com (unico test veritiero)
 * 3. Webhook         — webhook DM ricevuti (WebhookEventLog)
 * 4. Inbox & ARIA    — messaggi salvati in Inbox
 *
 * NON afferma mai "ARIA funziona" senza prova reale (DM in Inbox).
 * NON considera scopes validi senza chiamata API riuscita.
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
        {detail && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, wordBreak: 'break-all' }}>{detail}</div>}
        {sub && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ n, label, status }) {
  const dot = status === 'ok' ? '#10B981' : status === 'err' ? '#EF4444' : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6B7280', marginBottom: 6, marginTop: 12, fontWeight: 700, letterSpacing: 0.5 }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1F2937', border: `1px solid #374151`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>{n}</span>
      <span style={{ textTransform: 'uppercase' }}>{label}</span>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, marginLeft: 'auto' }} />
    </div>
  );
}

const fmt = (d) => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function MetaConnectionStatus({ connection, businessId }) {
  const [loading, setLoading]       = useState(true);
  const [testing, setTesting]       = useState(false);
  const [logs, setLogs]             = useState([]);
  const [messages, setMessages]     = useState([]);
  const [apiResult, setApiResult]   = useState(null); // risultato testMetaConnection
  const [showRaw, setShowRaw]       = useState(false);

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
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000)),
      ]);
      setApiResult(res.data || {});
    } catch (e) {
      setApiResult({ _error: e.message });
    } finally {
      setTesting(false);
      load(); // ricarica logs dopo test
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

  // ── LIVELLO 2: API Call reale ──
  const apiOk       = apiResult?.success === true;
  const apiError    = apiResult?.results?.profile?.error;
  const realScopes  = apiResult?.real_scopes || [];
  const basicReal   = apiResult?.instagram_business_basic_approved === true;
  const msgReal     = apiResult?.instagram_business_manage_messages_approved === true;
  const tokenDebug  = apiResult?.results?.token_debug;
  const apiStatus   = apiResult === null ? 'warn' : apiOk ? 'ok' : 'err';

  // ── LIVELLO 3: Webhook ──
  const lastDmLog   = logs.find(l => l.event_type === 'dm') || null;
  const lastErrLog  = logs.find(l => l.event_type === 'error') || null;
  const webhookOk   = !!lastDmLog;
  const webhookStatus = webhookOk ? 'ok' : logs.length > 0 ? 'warn' : 'warn';

  // ── LIVELLO 4: Inbox ──
  const lastMsg   = messages[0] || null;
  const inboxOk   = !!lastMsg;
  const inboxStatus = inboxOk ? 'ok' : 'warn';

  // Sintesi ARIA — operativa SOLO se tutti e 4 i livelli sono ok
  const ariaOk = oauthStatus === 'ok' && apiOk && webhookOk && inboxOk;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#4B5563', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>
        Diagnostica Connessione
      </div>

      {/* ── 1: OAuth & Token ── */}
      <SectionHeader n="1" label="OAuth & Token (DB locale)" status={oauthStatus} />
      {!tokenOk
        ? <Row level="err" title="Token mancante — riconnetti Instagram" />
        : isError190
          ? <Row level="err" title="⚠️ TOKEN META SCADUTO — Error 190 (Session has expired)" detail="Il token è stato invalidato da Meta. È necessario riconnettere Instagram tramite OAuth completo. ARIA non funziona." sub={connection?.refresh_error || connection?.sync_error} mono />
          : tokenExpired
            ? <Row level="err" title="Token SCADUTO (data di scadenza superata)" detail={`Scaduto il ${fmt(expiryDate)} — riconnetti`} />
            : <Row level="ok" title="Token presente e non scaduto" detail={daysLeft !== null ? `Scade tra ${daysLeft} giorni (${fmt(expiryDate)})` : 'Scadenza non registrata'} />
      }
      {connection?.last_refresh_at && !isError190 && (
        <Row level="info" title={`Ultimo refresh token: ${fmt(connection.last_refresh_at)}`} detail={connection?.oauth_long_lived === false ? '⚠️ Token short-lived (max ~1h) — reconnetti per ottenere long-lived' : 'Long-lived token (60 giorni)'} />
      )}
      <Row
        level={basicInDB ? 'info' : 'warn'}
        title={`instagram_business_basic in DB: ${basicInDB ? 'sì' : 'NON salvato'}`}
        detail="Questo è il valore salvato al momento del login — NON garantisce che Meta l'abbia approvato"
      />
      <Row
        level={msgInDB ? 'info' : 'warn'}
        title={`instagram_business_manage_messages in DB: ${msgInDB ? 'sì' : 'NON salvato'}`}
        detail="Valore DB — verifica con Test API qui sotto"
      />
      {connection?.ig_account_id && (
        <Row level="info" title={`ig_account_id: ${connection.ig_account_id}`} detail="Deve corrispondere a recipient.id nei webhook Meta" />
      )}

      {/* ── 2: API Call reale ── */}
      <SectionHeader n="2" label="Chiamata API Meta (test reale)" status={apiStatus} />

      {apiResult === null && !testing && (
        <div style={{ padding: '10px 12px', background: '#1F293780', border: '1px solid #374151', borderRadius: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Esegui il test per verificare se la chiamata a <code style={{ color: '#60A5FA', fontSize: 11 }}>graph.instagram.com/v21.0/{'{ig_account_id}'}</code> funziona davvero.
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
            Questo è l'unico modo per sapere se <strong style={{ color: '#9CA3AF' }}>instagram_business_basic</strong> è effettivamente approvato su Meta App Review.
          </div>
          <button
            onClick={runApiTest}
            style={{ background: '#3B82F620', border: '1px solid #3B82F640', borderRadius: 8, padding: '7px 14px', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🧪 Esegui Test API
          </button>
        </div>
      )}

      {testing && (
        <Row level="info" title="Test in corso..." detail="Chiamata a graph.instagram.com/v21.0/{ig_account_id}..." />
      )}

      {apiResult !== null && !testing && (
        <>
          {apiResult._error && (
            <Row level="err" title="Errore durante il test" detail={apiResult._error} />
          )}

          {!apiResult._error && (
            <>
              {/* Risultato profilo */}
              {apiOk ? (
                <Row level="ok"
                  title={`Profilo API OK — @${apiResult.account_name || apiResult.account_id}`}
                  detail={`account_type: ${apiResult.account_type || '?'} · endpoint: ${apiResult.endpoint_called}`}
                />
              ) : (
                <Row level="err"
                  title={`Chiamata API FALLITA — Meta error ${apiError?.code || '?'}`}
                  detail={apiError?.message}
                  sub={`fbtrace_id: ${apiError?.fbtrace_id || '?'} · subcode: ${apiError?.subcode || '?'}`}
                />
              )}

              {/* Diagnosi error 190 — token scaduto */}
              {!apiOk && (apiError?.code === 190 || (apiResult?.results?.profile?.http_status === 400 && (apiError?.message || '').toLowerCase().includes('session'))) && (
                <Row level="err"
                  title="⚠️ Error 190: Session has expired — TOKEN SCADUTO"
                  detail="Il token Instagram è stato invalidato da Meta. Causa: token scaduto (>60 giorni), revocato dall'utente, o password Instagram cambiata."
                  sub="Soluzione: clicca 'Riconnetti Instagram (OAuth nuovo)' per ottenere un token fresco. Il refresh automatico NON può recuperare un token error 190 — serve OAuth completo."
                />
              )}

              {/* Diagnosi errore 100 */}
              {!apiOk && apiError?.code === 100 && (
                <Row level="warn"
                  title="Meta error 100: Unsupported request - method type: get"
                  detail="Causa probabile: instagram_business_basic NON approvato in Meta App Review, OPPURE l'app è in modalità sviluppo e l'utente non è tester."
                  sub="Soluzione: vai su Meta App Dashboard → App Review → Permissions → instagram_business_basic → richiedi approvazione. In modalità sviluppo aggiungi l'account come Tester."
                />
              )}

              {/* Token debug — scopes REALI da Meta */}
              {tokenDebug && !tokenDebug.skipped && (
                <>
                  <div style={{ fontSize: 10, color: '#6B7280', margin: '8px 0 4px', fontWeight: 600 }}>Scopes REALI confermati da Meta (debug_token)</div>
                  {tokenDebug.error ? (
                    <Row level="warn" title="Token debug non disponibile" detail={tokenDebug.error?.message} />
                  ) : (
                    <>
                      <Row
                        level={tokenDebug.is_valid ? 'ok' : 'err'}
                        title={`Token ${tokenDebug.is_valid ? 'valido' : 'NON valido'} secondo Meta`}
                        detail={tokenDebug.expires_at ? `Scade: ${fmt(new Date(tokenDebug.expires_at * 1000))}` : undefined}
                      />
                      <Row
                        level={basicReal ? 'ok' : 'err'}
                        title={`instagram_business_basic: ${basicReal ? '✅ APPROVATO DA META' : '❌ NON approvato / non presente'}`}
                        detail={basicReal ? 'Scope reale verificato tramite debug_token API' : 'Lo scope non risulta nei token Meta. Vai su App Review.'}
                      />
                      <Row
                        level={msgReal ? 'ok' : 'err'}
                        title={`instagram_business_manage_messages: ${msgReal ? '✅ APPROVATO' : '❌ NON approvato'}`}
                      />
                      {realScopes.length > 0 && (
                        <Row level="info" title="Tutti gli scopes presenti nel token" detail={realScopes.join(', ')} />
                      )}
                    </>
                  )}
                </>
              )}
              {tokenDebug?.skipped && (
                <Row level="warn" title="Token debug saltato" detail={tokenDebug.reason} />
              )}

              {/* Raw toggle */}
              <button
                onClick={() => setShowRaw(v => !v)}
                style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', fontFamily: 'inherit' }}
              >
                {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRaw ? 'Nascondi' : 'Mostra'} risposta raw Meta
              </button>
              {showRaw && (
                <pre style={{ fontSize: 10, color: '#6B7280', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 10, overflow: 'auto', maxHeight: 200, marginBottom: 8 }}>
                  {JSON.stringify(apiResult.results, null, 2)}
                </pre>
              )}
            </>
          )}

          {/* Re-run button */}
          <button
            onClick={runApiTest}
            style={{ background: '#1F293780', border: '1px solid #374151', borderRadius: 8, padding: '5px 12px', color: '#6B7280', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}
          >
            <RefreshCw size={11} /> Ripeti test API
          </button>
        </>
      )}

      {/* ── 3: Webhook ── */}
      <SectionHeader n="3" label="Webhook Meta → DM ricevuti" status={webhookStatus} />
      {logs.length === 0 ? (
        <Row level="warn"
          title="Nessun webhook ricevuto da Meta per questa connessione"
          detail="Verifica nel Meta App Dashboard: Webhooks → Instagram → subscribed fields (messages, messaging_postbacks). L'account deve aver accettato i permessi messages."
          sub="Se l'app è in modalità sviluppo, solo Tester e Admin possono inviare DM."
        />
      ) : !webhookOk ? (
        <Row level="warn"
          title={`${logs.length} webhook ricevuti ma nessun DM`}
          detail={`Ultimo: ${fmt(logs[0]?.created_date)} — tipo: ${logs[0]?.event_type}`}
          sub={logs[0]?.raw_payload ? logs[0].raw_payload.slice(0, 300) : undefined}
          mono
        />
      ) : (
        <Row level="ok"
          title="Webhook DM ricevuto e processato"
          detail={`Ultimo: ${fmt(lastDmLog?.created_date)} · sender: ${lastDmLog?.sender_id || '?'} → recipient: ${lastDmLog?.recipient_id || '?'} · matched: ${lastDmLog?.matched_connection ? 'sì' : 'NO'}`}
        />
      )}
      {lastErrLog && (
        <Row level="err"
          title="Errore webhook"
          detail={lastErrLog.processing_error || 'Vedi raw payload'}
          sub={lastErrLog.raw_payload?.slice(0, 200)}
          mono
        />
      )}

      {/* ── 4: Inbox & ARIA ── */}
      <SectionHeader n="4" label="Inbox & ARIA (DM reali)" status={inboxStatus} />
      {!inboxOk ? (
        <Row level="warn"
          title="Nessun messaggio Instagram in Inbox"
          detail="I DM non sono ancora arrivati o il webhook non è configurato. ARIA non è testata."
          sub="ARIA è considerata operativa SOLO quando almeno un DM reale appare in Inbox."
        />
      ) : (
        <Row level="ok"
          title="Messaggi Instagram presenti in Inbox"
          detail={`Ultimo: ${fmt(lastMsg?.created_date)} · ruolo: ${lastMsg?.ruolo}`}
        />
      )}

      {/* ── Sintesi finale ── */}
      <div style={{ marginTop: 10, padding: '10px 14px', background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, fontSize: 11 }}>
        <div style={{ fontWeight: 800, color: '#9CA3AF', marginBottom: 6, letterSpacing: 0.5 }}>STATO REALE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          {[
            { label: 'OAuth',        ok: oauthStatus === 'ok' },
            { label: 'API Meta',     ok: apiOk, unknown: apiResult === null },
            { label: 'Webhook DM',   ok: webhookOk },
            { label: 'Inbox & ARIA', ok: inboxOk },
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