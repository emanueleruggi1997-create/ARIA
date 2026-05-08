/**
 * InboxRecovery — mostra webhook Instagram non processati / non visibili in Inbox.
 * Permette recupero manuale di conversazioni perse.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatSafeTimestamp } from '@/lib/safeDate.js';
import { RefreshCw, AlertTriangle, Eye } from 'lucide-react';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', ig: '#DD2A7B', danger: '#FF3860',
  success: '#00E5A0', warn: '#F59E0B',
};

const fmt = (d) => formatSafeTimestamp(d, 'dd/MM HH:mm:ss', '—');

export default function InboxRecovery({ businessId, igAccountId, onRecoverConversation }) {
  const [recovering, setRecovering] = useState(null);
  const queryClient = useQueryClient();

  // Carica ultimi 30 webhook IG ricevuti (non solo quelli di questa connessione)
  const { data: webhooks = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recovery-webhooks', businessId],
    queryFn: async () => {
      const all = await base44.entities.WebhookEventLog.filter(
        { provider: 'instagram', event_type: 'dm' },
        '-created_date',
        30
      ).catch(() => []);
      return all;
    },
    enabled: !!businessId,
    staleTime: 10_000,
  });

  // Per ogni webhook, controlla se esiste il messaggio in Inbox
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-recovery', businessId],
    queryFn: () => base44.entities.Contact.filter({ business_id: businessId, canale: 'instagram' }).catch(() => []),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const contactBySender = {};
  contacts.forEach(c => { if (c.numero) contactBySender[c.numero] = c; });

  // Recupera manualmente un webhook non processato: crea Contact + Message
  const recoverWebhook = async (wh) => {
    if (recovering === wh.id) return;
    setRecovering(wh.id);
    try {
      const senderId = wh.sender_id;
      if (!senderId) return;

      // Cerca o crea contatto
      let contact = contactBySender[senderId];
      if (!contact) {
        contact = await base44.entities.Contact.create({
          business_id: businessId,
          nome: `Utente Instagram (${senderId.slice(-6)})`,
          numero: senderId,
          canale: 'instagram',
          stato: 'lead',
        });
      }

      // Estrai testo dal raw payload
      let msgText = '[Messaggio recuperato]';
      try {
        const raw = JSON.parse(wh.raw_payload || '{}');
        msgText = raw.text || raw.body?.entry?.[0]?.messaging?.[0]?.message?.text || '[Messaggio recuperato]';
      } catch {}

      // Crea messaggio
      await base44.entities.Message.create({
        business_id: businessId,
        contact_id: contact.id,
        canale: 'instagram',
        ruolo: 'user',
        testo: msgText,
        letto: false,
      });

      // Segna webhook come processato
      await base44.entities.WebhookEventLog.update(wh.id, {
        processed: true,
        processing_error: 'recovered_manually',
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['contacts', businessId] });
      queryClient.invalidateQueries({ queryKey: ['all-messages', businessId] });
      queryClient.invalidateQueries({ queryKey: ['recovery-webhooks', businessId] });
      queryClient.invalidateQueries({ queryKey: ['contacts-recovery', businessId] });

      onRecoverConversation?.({ contact_id: contact.id, nome: contact.nome, canale: 'instagram' });
    } catch (e) {
      console.error('[InboxRecovery] recover failed:', e.message);
    } finally {
      setRecovering(null);
    }
  };

  const unprocessed = webhooks.filter(w => !w.processed);
  const processed   = webhooks.filter(w => w.processed);

  return (
    <div style={{ padding: '12px 14px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <AlertTriangle size={16} style={{ color: C.warn, flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Recovery Inbox</span>
        <span style={{ fontSize: 11, color: C.muted, background: C.card, borderRadius: 20, padding: '2px 8px' }}>
          {webhooks.length} webhook IG
        </span>
        <button onClick={() => refetch()} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <RefreshCw size={12} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          Aggiorna
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 12, background: '#F59E0B08', border: '1px solid #F59E0B20', borderRadius: 8, padding: '8px 12px' }}>
        Mostra tutti i DM Instagram ricevuti dal webhook. Se una conversazione non appare in Inbox, usa "Recupera" per forzare la creazione.
        {igAccountId && <div style={{ marginTop: 4 }}>Account attivo: <code style={{ color: '#60A5FA', fontSize: 10 }}>{igAccountId}</code></div>}
      </div>

      {isLoading && <div style={{ color: C.muted, fontSize: 12 }}>Caricamento...</div>}

      {/* Non processati — priorità */}
      {unprocessed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.danger, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            ❌ Non processati ({unprocessed.length}) — potenzialmente persi
          </div>
          {unprocessed.map(wh => (
            <WebhookRow
              key={wh.id}
              wh={wh}
              contact={contactBySender[wh.sender_id]}
              isRecovering={recovering === wh.id}
              onRecover={() => recoverWebhook(wh)}
              danger
            />
          ))}
        </>
      )}

      {/* Processati */}
      {processed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.success, letterSpacing: 1, margin: '14px 0 8px', textTransform: 'uppercase' }}>
            ✅ Processati ({processed.length})
          </div>
          {processed.map(wh => (
            <WebhookRow
              key={wh.id}
              wh={wh}
              contact={contactBySender[wh.sender_id]}
              isRecovering={recovering === wh.id}
              onRecover={!wh.matched_connection ? () => recoverWebhook(wh) : undefined}
            />
          ))}
        </>
      )}

      {webhooks.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 13 }}>Nessun webhook Instagram ricevuto</div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function WebhookRow({ wh, contact, isRecovering, onRecover, danger }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${danger ? '#EF444430' : '#1A2E4A'}`,
      borderRadius: 10,
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: danger ? '#EF4444' : '#10B981' }}>
              {danger ? '❌ Non processato' : '✅ Processato'}
            </span>
            {wh.matched_connection === false && (
              <span style={{ fontSize: 10, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 20, padding: '1px 6px' }}>
                ⚠️ Connection non trovata
              </span>
            )}
            <span style={{ fontSize: 10, color: C.muted }}>{fmt(wh.created_date)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '3px 8px', fontSize: 10 }}>
            <span style={{ color: '#4B5563' }}>sender_id</span>
            <span style={{ color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all' }}>{wh.sender_id || '—'}</span>
            <span style={{ color: '#4B5563' }}>recipient_id</span>
            <span style={{ color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all' }}>{wh.recipient_id || '—'}</span>
            <span style={{ color: '#4B5563' }}>contact</span>
            <span style={{ color: contact ? '#10B981' : '#F59E0B' }}>
              {contact ? `✅ ${contact.nome}` : '⚠️ Non trovato in Inbox'}
            </span>
            {wh.processing_error && (
              <>
                <span style={{ color: '#4B5563' }}>errore</span>
                <span style={{ color: '#EF4444' }}>{wh.processing_error.slice(0, 100)}</span>
              </>
            )}
          </div>

          {expanded && wh.raw_payload && (
            <pre style={{ fontSize: 9, color: '#6B7280', background: '#0F172A', borderRadius: 6, padding: 8, marginTop: 6, overflow: 'auto', maxHeight: 200 }}>
              {(() => {
                try { return JSON.stringify(JSON.parse(wh.raw_payload), null, 2).slice(0, 2000); }
                catch { return wh.raw_payload.slice(0, 2000); }
              })()}
            </pre>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'none', color: C.muted, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <Eye size={10} /> {expanded ? 'Nascondi' : 'Raw'}
          </button>
          {onRecover && (
            <button
              onClick={onRecover}
              disabled={isRecovering}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #10B98140', background: '#10B98110', color: '#10B981', fontSize: 10, fontWeight: 700, cursor: isRecovering ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {isRecovering ? '...' : '↩ Recupera'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}