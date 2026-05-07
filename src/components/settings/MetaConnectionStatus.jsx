/**
 * MetaConnectionStatus — pannello diagnostica veritiero.
 * Mostra 3 livelli separati: OAuth / Webhook / ARIA pipeline.
 * Non afferma mai che "ARIA funziona" senza prove reali.
 */
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';

const C = {
  ok:   { bg: '#10B98110', border: '#10B98140', text: '#10B981', icon: '✅' },
  warn: { bg: '#F59E0B10', border: '#F59E0B40', text: '#F59E0B', icon: '⚠️' },
  err:  { bg: '#EF444410', border: '#EF444440', text: '#EF4444', icon: '❌' },
  info: { bg: '#00C6FF10', border: '#00C6FF40', text: '#00C6FF', icon: 'ℹ️' },
};

function Row({ level, title, detail, sub }) {
  const s = C[level] || C.info;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '9px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: s.text }}>{title}</div>
        {detail && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, wordBreak: 'break-all' }}>{detail}</div>}
        {sub && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function MetaConnectionStatus({ connection, businessId }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!connection?.id || !businessId) { setLoading(false); return; }
    Promise.all([
      base44.entities.WebhookEventLog.filter(
        { connection_id: connection.id },
        '-created_date', 5
      ).catch(() => []),
      base44.entities.Message.filter(
        { business_id: businessId, canale: 'instagram' },
        '-created_date', 1
      ).catch(() => []),
    ]).then(([wl, msgs]) => {
      setLogs(wl || []);
      setMessages(msgs || []);
    }).finally(() => setLoading(false));
  }, [connection?.id, businessId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', padding: '8px 0' }}>
      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Caricamento diagnostica...
    </div>
  );

  // ── LIVELLO 1: OAuth ──
  const tokenOk = !!connection?.access_token;
  const basicOk = connection?.has_basic_scope === true || (connection?.granted_scopes || '').includes('instagram_business_basic');
  const msgOk   = connection?.has_messages_scope === true || (connection?.granted_scopes || '').includes('instagram_business_manage_messages');
  const expiryDate = connection?.ig_token_expires_at ? new Date(connection.ig_token_expires_at) : null;
  const tokenExpired = expiryDate && expiryDate < new Date();
  const daysLeft = expiryDate ? Math.round((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // ── LIVELLO 2: Webhook ──
  const lastLog       = logs[0] || null;
  const lastDmLog     = logs.find(l => l.event_type === 'dm') || null;
  const lastErrLog    = logs.find(l => l.event_type === 'error') || null;
  const webhookEver   = logs.length > 0;
  const webhookOk     = !!lastDmLog;

  // ── LIVELLO 3: ARIA / Inbox ──
  const lastMsg       = messages[0] || null;
  const inboxOk       = !!lastMsg;

  const fmt = (d) => d ? new Date(d).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', letterSpacing: 1, marginBottom: 8 }}>
        DIAGNOSTICA CONNESSIONE
      </div>

      {/* ── LIVELLO 1: OAuth ── */}
      <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, fontWeight: 600 }}>1. OAuth & Token</div>
      {!tokenOk && <Row level="err" title="Token mancante" detail="Riconnetti Instagram" />}
      {tokenOk && tokenExpired && <Row level="err" title="Token SCADUTO" detail={`Scaduto il ${fmt(expiryDate)} — riconnetti`} />}
      {tokenOk && !tokenExpired && <Row level="ok" title="Token valido" detail={daysLeft !== null ? `Scade tra ${daysLeft} giorni` : undefined} />}
      {basicOk
        ? <Row level="ok" title="Scope instagram_business_basic presente" />
        : <Row level="err" title="Scope instagram_business_basic MANCANTE" detail="Riconnetti accettando tutti i permessi" />
      }
      {msgOk
        ? <Row level="ok" title="Scope instagram_business_manage_messages presente" />
        : <Row level="err" title="Scope instagram_business_manage_messages MANCANTE" detail="Riconnetti accettando tutti i permessi" />
      }
      {connection?.ig_account_id && (
        <Row level="info" title={`ig_account_id: ${connection.ig_account_id}`} detail="Deve corrispondere a recipient.id nei webhook" />
      )}

      {/* ── LIVELLO 2: Webhook ── */}
      <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, marginTop: 10, fontWeight: 600 }}>2. Webhook</div>
      {!webhookEver && (
        <Row level="warn"
          title="Nessun webhook ricevuto da Meta per questa connessione"
          detail="Verifica: la subscription webhook è configurata nel Meta App Dashboard? L'account Business ha approvato i permessi messages?"
        />
      )}
      {webhookEver && !webhookOk && (
        <Row level="warn"
          title={`Webhook ricevuti (${logs.length}) ma nessun DM`}
          detail={lastLog ? `Ultimo: ${fmt(lastLog.created_date)} — tipo: ${lastLog.event_type}` : undefined}
          sub={lastLog?.raw_payload ? `Payload: ${lastLog.raw_payload.slice(0, 200)}...` : undefined}
        />
      )}
      {webhookOk && (
        <Row level="ok"
          title="✅ Webhook DM ricevuto"
          detail={`Ultimo DM: ${fmt(lastDmLog?.created_date)} · sender: ${lastDmLog?.sender_id || '?'} → recipient: ${lastDmLog?.recipient_id || '?'}`}
        />
      )}
      {lastErrLog && (
        <Row level="err"
          title="Errore webhook rilevato"
          detail={lastErrLog.processing_error || 'Vedi raw payload'}
          sub={lastErrLog.raw_payload?.slice(0, 300)}
        />
      )}

      {/* ── LIVELLO 3: Inbox / ARIA ── */}
      <div style={{ fontSize: 10, color: '#374151', marginBottom: 4, marginTop: 10, fontWeight: 600 }}>3. Inbox & ARIA</div>
      {!inboxOk && (
        <Row level="warn"
          title="Nessun messaggio Instagram salvato in Inbox"
          detail="I DM non sono ancora arrivati, oppure il webhook non è collegato correttamente."
        />
      )}
      {inboxOk && (
        <Row level="ok"
          title="Messaggi Instagram presenti in Inbox"
          detail={`Ultimo: ${fmt(lastMsg?.created_date)} · ruolo: ${lastMsg?.ruolo}`}
        />
      )}

      {/* Sintesi */}
      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11, color: '#6B7280' }}>
        <strong style={{ color: '#9CA3AF' }}>Stato reale:</strong>{' '}
        OAuth {tokenOk && !tokenExpired && basicOk && msgOk ? '✅' : '❌'} ·{' '}
        Webhook {webhookOk ? '✅' : '⚠️ non verificato'} ·{' '}
        Inbox {inboxOk ? '✅' : '⚠️ vuota'} ·{' '}
        ARIA {inboxOk && webhookOk ? '✅ attiva' : '⚠️ non testata'}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}