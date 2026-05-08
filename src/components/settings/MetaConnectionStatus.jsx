/**
 * MetaConnectionStatus — diagnostica con test DM live basato su timestamp.
 * Il "test DM" considera SOLO webhook ricevuti DOPO il click del pulsante,
 * con recipient_id === ig_account_id della connessione corrente.
 */
import React, { useEffect, useState, useRef } from 'react';
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

const fmt = (d) => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

// Stati possibili del test DM live
const DM_TEST_IDLE    = 'idle';
const DM_TEST_WAITING = 'waiting'; // in attesa del DM (polling)
const DM_TEST_SUCCESS = 'success'; // DM ricevuto e processato
const DM_TEST_FAILED  = 'failed';  // timeout senza DM

export default function MetaConnectionStatus({ connection, businessId }) {
  const [loading, setLoading]     = useState(true);
  const [testing, setTesting]     = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [showRaw, setShowRaw]     = useState(false);

  // ── Stato test DM live ──
  const [dmTestState, setDmTestState]       = useState(DM_TEST_IDLE);
  const [dmTestStartedAt, setDmTestStartedAt] = useState(null); // Date object
  const [dmTestSecondsLeft, setDmTestSecondsLeft] = useState(60);
  const [dmTestResult, setDmTestResult]     = useState(null); // WebhookEventLog trovato
  const [dmTestMessage, setDmTestMessage]   = useState(null); // Message trovato in inbox
  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (connection?.id && businessId) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [connection?.id, businessId]);

  // Cleanup poll/timer on unmount
  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  }, []);

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

  // ── Avvia test DM live ──
  const startDmTest = () => {
    if (dmTestState === DM_TEST_WAITING) return;
    const startedAt = new Date();
    setDmTestStartedAt(startedAt);
    setDmTestState(DM_TEST_WAITING);
    setDmTestResult(null);
    setDmTestMessage(null);
    setDmTestSecondsLeft(60);

    const igAccountId = connection?.ig_account_id;

    // Countdown timer
    let remaining = 60;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setDmTestSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    // Polling ogni 3 secondi per max 60 secondi
    let elapsed = 0;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      if (elapsed > 60) {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setDmTestState(DM_TEST_FAILED);
        setDmTestSecondsLeft(0);
        return;
      }

      try {
        // Cerca webhook DM ricevuti DOPO startedAt, per questa connessione specifica
        // con recipient_id === ig_account_id
        const allLogs = await base44.entities.WebhookEventLog.filter(
          { connection_id: connection.id, event_type: 'dm' },
          '-created_date',
          20
        ).catch(() => []);

        // Filtra: solo quelli DOPO il test started e con recipient_id corrispondente
        const matchingLogs = allLogs.filter(log => {
          if (!log.created_date) return false;
          const logDate = new Date(log.created_date);
          if (logDate <= startedAt) return false; // vecchio
          // recipient_id deve corrispondere a ig_account_id
          if (igAccountId && log.recipient_id && log.recipient_id !== igAccountId) return false;
          return true;
        });

        if (matchingLogs.length > 0) {
          const found = matchingLogs[0]; // più recente
          setDmTestResult(found);

          // Cerca anche il messaggio in Inbox creato dopo il test
          if (found.processed) {
            const msgs = await base44.entities.Message.filter(
              { business_id: businessId, canale: 'instagram' },
              '-created_date',
              5
            ).catch(() => []);
            const newMsg = msgs.find(m => {
              if (!m.created_date) return false;
              return new Date(m.created_date) > startedAt && m.ruolo === 'user';
            });
            setDmTestMessage(newMsg || null);
          }

          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setDmTestState(DM_TEST_SUCCESS);
          setDmTestSecondsLeft(0);
        }
      } catch (_) {
        // ignora errori di polling
      }
    }, 3000);
  };

  const resetDmTest = () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    setDmTestState(DM_TEST_IDLE);
    setDmTestStartedAt(null);
    setDmTestResult(null);
    setDmTestMessage(null);
    setDmTestSecondsLeft(60);
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
  const apiOk        = apiResult?.success === true;
  const accountType  = apiResult?.account_type || null;
  const isBusiness   = apiResult?.is_business_or_creator === true;
  const userRole     = apiResult?.user_role_in_app;
  const userRoleOk   = apiResult?.user_role_ok;
  const apiStatus    = apiResult === null ? 'warn' : apiOk ? 'ok' : 'err';

  // ── Livello 3: Webhook fields ──
  const subscribedFields = apiResult?.subscribed_fields || [];
  const missingFields    = apiResult?.missing_fields || [];
  const webhookFieldsOk  = apiResult !== null
    ? (subscribedFields.includes('messages') && subscribedFields.includes('messaging_postbacks'))
    : null;
  const webhookFieldStatus = webhookFieldsOk === null ? 'warn' : webhookFieldsOk ? 'ok' : 'err';

  // ── Diagnosi ──
  const diagnosis = apiResult?.diagnosis || [];
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
      {connection?.ig_account_id && (
        <Row level="info" title={`Account ID: ${connection.ig_account_id}`} detail={connection.ig_account_name ? `@${connection.ig_account_name}` : undefined} />
      )}

      {/* ── 2: Test API ── */}
      <SectionHeader n="2" label="Test API Meta (endpoint reali)" status={apiStatus} />

      {apiResult === null && !testing && (
        <div style={{ padding: '12px', background: '#1F293780', border: '1px solid #374151', borderRadius: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Verifica: profilo IG, tipo account, endpoint DM, webhook fields, ruolo utente.
          </div>
          <button onClick={runApiTest} style={{ background: '#3B82F620', border: '1px solid #3B82F640', borderRadius: 8, padding: '7px 14px', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🧪 Esegui Diagnostica Completa
          </button>
        </div>
      )}

      {testing && <Row level="info" title="Diagnostica in corso... (20-45s)" detail="Eseguendo test su endpoint Meta ufficiali IG Business Login" />}

      {apiResult !== null && !testing && (
        <>
          {apiResult._error && <Row level="err" title="Errore durante il test" detail={apiResult._error} />}

          {!apiResult._error && (
            <>
              {/* Endpoint summary */}
              {apiResult.endpoint_summary && (
                <div style={{ marginBottom: 8 }}>
                  {Object.entries(apiResult.endpoint_summary).map(([ep, verdict]) => (
                    <Row key={ep}
                      level={verdict.startsWith('✅') ? 'ok' : verdict.startsWith('⚠️') ? 'warn' : 'err'}
                      title={ep}
                      detail={verdict}
                    />
                  ))}
                </div>
              )}

              {/* Profilo */}
              {apiOk ? (
                <Row level="ok"
                  title={`Profilo OK — @${apiResult.account_name} · ${accountType}`}
                  detail={isBusiness ? 'Account BUSINESS/CREATOR — compatibile con IG Business Login' : `⚠️ Account type ${accountType} — serve BUSINESS o CREATOR`}
                />
              ) : (
                <Row level="err"
                  title={`Profilo non raggiungibile — vedi endpoint summary sopra`}
                />
              )}

              {/* App Role */}
              <Row
                level={userRoleOk ? 'ok' : (userRole ? 'warn' : 'err')}
                title={`Ruolo nell'app Meta: ${userRole || 'NON trovato'}`}
                detail={userRoleOk
                  ? 'Utente autorizzato (Developer/Admin/Tester)'
                  : 'In dev mode solo Developer/Admin/Tester possono inviare DM. Aggiungi su Meta App Dashboard → Roles.'}
              />

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
        <Row level="warn" title="Non verificato — esegui Test API sopra" />
      ) : webhookFieldsOk ? (
        <Row level="ok" title={`Fields attivi: ${subscribedFields.join(', ')}`} detail="Meta invierà eventi DM a questo account" />
      ) : (
        <Row level="err" title={`Fields mancanti: ${missingFields.join(', ')}`} detail="Meta NON invia eventi DM." />
      )}

      {/* ── 4: Test DM live ── */}
      <SectionHeader n="4"
        label="Test DM reale (live)"
        status={dmTestState === DM_TEST_SUCCESS ? 'ok' : dmTestState === DM_TEST_FAILED ? 'err' : 'warn'}
      />

      {/* Pulsante avvia test */}
      {dmTestState === DM_TEST_IDLE && (
        <div style={{ padding: '12px', background: '#1F293780', border: '1px solid #374151', borderRadius: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            Verifica end-to-end: invia un DM reale all'account Instagram collegato e controlla se arriva in Inbox.
            Il test considera SOLO webhook ricevuti dopo il click, con recipient_id = <code style={{ color: '#60A5FA', fontSize: 10 }}>{connection?.ig_account_id}</code>.
          </div>
          <button onClick={startDmTest} style={{ background: '#10B98120', border: '1px solid #10B98140', borderRadius: 8, padding: '8px 16px', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📨 Avvia Test DM
          </button>
        </div>
      )}

      {/* In attesa DM */}
      {dmTestState === DM_TEST_WAITING && (
        <div style={{ padding: '14px', background: '#3B82F610', border: '1px solid #3B82F640', borderRadius: 10, marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Loader2 size={16} style={{ color: '#60A5FA', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 13, color: '#60A5FA' }}>In attesa DM... {dmTestSecondsLeft}s</span>
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
            👉 <strong style={{ color: '#E8F4FF' }}>Invia ora un DM</strong> da un account Tester all'account Instagram collegato:
          </div>
          <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
            Destinatario: <strong>@{connection?.ig_account_name || connection?.ig_account_id}</strong>
          </div>
          <div style={{ fontSize: 10, color: '#4B5563' }}>
            Test iniziato: {fmt(dmTestStartedAt)} · Solo webhook con recipient_id = {connection?.ig_account_id}
          </div>
          <button onClick={resetDmTest} style={{ marginTop: 8, background: 'none', border: '1px solid #374151', borderRadius: 6, padding: '4px 10px', color: '#6B7280', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            Annulla
          </button>
        </div>
      )}

      {/* Risultato: DM ricevuto */}
      {dmTestState === DM_TEST_SUCCESS && dmTestResult && (
        <div style={{ padding: '14px', background: '#10B98110', border: '1px solid #10B98140', borderRadius: 10, marginBottom: 5 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#10B981', marginBottom: 10 }}>
            ✅ DM REALE RICEVUTO dopo il test
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <InfoLine label="Ricevuto alle" value={fmt(dmTestResult.created_date)} />
            <InfoLine label="sender_id" value={dmTestResult.sender_id || '—'} mono />
            <InfoLine label="recipient_id" value={dmTestResult.recipient_id || '—'} mono />
            <InfoLine label="matched_connection" value={dmTestResult.matched_connection ? '✅ sì' : '❌ no'} />
            <InfoLine label="processed" value={dmTestResult.processed ? '✅ sì' : '❌ no'} />
            {dmTestResult.processing_error && (
              <InfoLine label="errore processing" value={dmTestResult.processing_error} err />
            )}
          </div>

          {dmTestResult.processed && (
            <>
              <div style={{ marginTop: 10, fontWeight: 700, fontSize: 11, color: '#10B981' }}>📥 Inbox</div>
              {dmTestMessage ? (
                <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                  <InfoLine label="Messaggio in Inbox" value="✅ creato" />
                  <InfoLine label="contact_id" value={dmTestMessage.contact_id} mono />
                  <InfoLine label="Timestamp" value={fmt(dmTestMessage.created_date)} />
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>
                  ⚠️ Messaggio processato ma non trovato in Inbox (contact_id potrebbe non corrispondere o c'è stato un errore)
                </div>
              )}
            </>
          )}

          {!dmTestResult.processed && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#EF4444' }}>
              ❌ Webhook ricevuto ma NON processato — vedi errore sopra. ARIA non ha risposto.
            </div>
          )}

          <button onClick={resetDmTest} style={{ marginTop: 10, background: '#1F293780', border: '1px solid #374151', borderRadius: 6, padding: '5px 12px', color: '#6B7280', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 Ripeti test
          </button>
        </div>
      )}

      {/* Risultato: timeout senza DM */}
      {dmTestState === DM_TEST_FAILED && (
        <div style={{ padding: '14px', background: '#EF444410', border: '1px solid #EF444440', borderRadius: 10, marginBottom: 5 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#EF4444', marginBottom: 8 }}>
            ❌ NESSUN DM REALE RICEVUTO DOPO IL TEST
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>
            Nessun webhook con recipient_id = <code style={{ color: '#EF4444' }}>{connection?.ig_account_id}</code> ricevuto nei 60 secondi dopo {fmt(dmTestStartedAt)}.
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            Cause probabili:
          </div>
          <ul style={{ fontSize: 11, color: '#6B7280', marginTop: 4, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Meta non sta inviando webhook → controlla Callback URL e Verify Token nel Meta App Dashboard</li>
            <li>L'account che ha mandato il DM non è Tester dell'app → Meta App Dashboard → Roles → Testers</li>
            <li>Webhook fields non attivi → usa "Sottoscrivi webhook fields" nella sezione 3</li>
            <li>recipient_id nel webhook non corrisponde a <code style={{ color: '#60A5FA' }}>{connection?.ig_account_id}</code> → mismatch account</li>
          </ul>
          <button onClick={resetDmTest} style={{ marginTop: 10, background: '#1F293780', border: '1px solid #374151', borderRadius: 6, padding: '5px 12px', color: '#6B7280', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 Riprova test
          </button>
        </div>
      )}

      {/* ── 5: Stato OPERATIVO ── */}
      <SectionHeader n="5" label="Stato Operativo" status={dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed ? 'ok' : 'warn'} />
      <div style={{ padding: '12px 14px', background: '#0F172A', border: `1px solid ${isOperative || (dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed) ? '#10B98140' : '#1E293B'}`, borderRadius: 10, fontSize: 11 }}>
        <div style={{ fontWeight: 800, color: (dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed) ? '#10B981' : '#9CA3AF', marginBottom: 8, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: (dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed) ? '#10B981' : '#EF4444', flexShrink: 0 }} />
          {(dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed) ? 'OPERATIVA — ARIA risponde ai DM' : dmTestState === DM_TEST_IDLE ? 'Non verificato — avvia Test DM' : dmTestState === DM_TEST_FAILED ? 'NON OPERATIVA — nessun DM ricevuto nel test' : 'Test DM in corso...'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
          {[
            { label: 'OAuth & Token',     ok: oauthStatus === 'ok' },
            { label: 'API endpoint IG',   ok: apiOk,              unknown: apiResult === null },
            { label: 'Account Business',  ok: isBusiness,         unknown: apiResult === null },
            { label: 'Ruolo Tester/Dev',  ok: userRoleOk,         unknown: apiResult === null },
            { label: 'Webhook fields',    ok: webhookFieldsOk,    unknown: apiResult === null },
            { label: 'DM reale ricevuto', ok: dmTestState === DM_TEST_SUCCESS, unknown: dmTestState === DM_TEST_IDLE },
            { label: 'DM in Inbox',       ok: dmTestState === DM_TEST_SUCCESS && !!dmTestMessage, unknown: dmTestState === DM_TEST_IDLE },
            { label: 'DM processato',     ok: dmTestState === DM_TEST_SUCCESS && dmTestResult?.processed, unknown: dmTestState === DM_TEST_IDLE },
          ].map(({ label, ok, unknown }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{ fontSize: 11 }}>{unknown ? '❓' : ok ? '✅' : '❌'}</span>
              <span style={{ color: unknown ? '#4B5563' : ok ? '#10B981' : '#EF4444', fontWeight: 600, fontSize: 11 }}>{label}</span>
              {unknown && <span style={{ color: '#374151', fontSize: 10 }}>(non testato)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Guida Fix ── */}
      {!apiOk && apiResult !== null && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#0F172A', border: '1px solid #F59E0B40', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: '#F59E0B', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>🔧 Guida alla Risoluzione — Error 100</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            <ol style={{ paddingLeft: 16, lineHeight: 1.9, margin: 0 }}>
              <li><strong style={{ color: '#E8F4FF' }}>PASSO 1:</strong> Meta App Dashboard → <strong style={{ color: '#60A5FA' }}>Roles → Testers → Add Testers</strong> (inserisci username IG)</li>
              <li><strong style={{ color: '#E8F4FF' }}>PASSO 2:</strong> L'account aggiunto accetta l'invito da IG/FB</li>
              <li><strong style={{ color: '#E8F4FF' }}>PASSO 3:</strong> Riconnetti Instagram → OAuth completo</li>
              <li><strong style={{ color: '#E8F4FF' }}>PASSO 4:</strong> Verifica che l'account sia <strong>Business o Creator</strong> su Instagram</li>
            </ol>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Helper inline per righe di dettaglio
function InfoLine({ label, value, mono, err }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
      <span style={{ color: '#4B5563', flexShrink: 0, minWidth: 130 }}>{label}:</span>
      <span style={{ color: err ? '#EF4444' : '#9CA3AF', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}