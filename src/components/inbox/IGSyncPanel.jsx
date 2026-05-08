/**
 * IGSyncPanel — pannello diagnostico completo per la sincronizzazione Instagram.
 * Mostra: token usato, account IG, endpoint chiamato, conversazioni trovate/importate, errori Meta.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, UserPlus, AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', ig: '#DD2A7B',
  success: '#00E5A0', warn: '#F59E0B', danger: '#EF4444', accent: '#7000FF',
};

function DiagRow({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
      <span style={{ color: C.muted, flexShrink: 0, minWidth: 120 }}>{label}</span>
      <span style={{ color: color || C.text, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', fontWeight: mono ? 400 : 600 }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function IGSyncPanel({ businessId, onClose, onSyncDone, onOpenManualModal }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncInstagramConversations', {});
      const data = res.data || {};
      setResult(data);
      if (data.success && data.imported > 0) {
        onSyncDone?.();
      }
    } catch (e) {
      setResult({ success: false, _call_error: e.message });
    } finally {
      setSyncing(false);
    }
  };

  // Colore stato principale
  const statusColor = !result ? C.muted
    : result.token_expired ? C.danger
    : result.success ? C.success
    : C.danger;

  const statusIcon = !result ? null
    : result.token_expired ? '🔑'
    : result.success ? '✅'
    : '❌';

  const statusLabel = !result ? null
    : result.token_expired ? 'TOKEN SCADUTO'
    : result.success ? 'Sincronizzazione completata'
    : result.api_supported === false ? 'API Meta non disponibile'
    : 'Errore';

  return (
    <div style={{
      width: 380, height: '100%', background: C.surface,
      borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#F58529,#DD2A7B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RefreshCw size={13} style={{ color: '#fff' }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text, flex: 1 }}>Sincronizza Instagram</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── LIMITE META — avviso fisso ── */}
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F59E0B08', border: '1px solid #F59E0B30' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
            <AlertTriangle size={13} style={{ color: C.warn, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontWeight: 800, fontSize: 11, color: C.warn }}>Limite API Meta</span>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.7 }}>
            I messaggi inviati <strong style={{ color: C.text }}>direttamente dall'app Instagram</strong> (fuori da Emaral) <strong style={{ color: '#F87171' }}>non sono recuperabili via API</strong> — Meta non li espone.<br />
            Le conversazioni appaiono in Emaral <strong style={{ color: C.text }}>solo quando il cliente risponde</strong> e Meta invia il webhook.
          </div>
        </div>

        {/* ── BOTTONE SYNC ── */}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: syncing ? `${C.ig}20` : `linear-gradient(135deg,#F58529,${C.ig})`,
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: syncing ? 0.7 : 1,
          }}
        >
          <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizzazione in corso...' : '🔄 Sincronizza conversazioni Instagram'}
        </button>

        {/* ── RISULTATO DIAGNOSTICA COMPLETA ── */}
        {result && (
          <div style={{ borderRadius: 12, border: `1px solid ${statusColor}40`, overflow: 'hidden' }}>
            {/* Status bar */}
            <div style={{ padding: '10px 14px', background: `${statusColor}15`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{statusIcon}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: statusColor }}>{statusLabel}</span>
            </div>

            {/* Dati diagnostici */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* TOKEN SCADUTO */}
              {result.token_expired && (
                <div style={{ marginBottom: 12, padding: '10px 12px', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, fontSize: 12, color: C.danger, lineHeight: 1.6 }}>
                  🔑 <strong>Il token Instagram è scaduto.</strong><br />
                  <span style={{ color: '#9CA3AF' }}>Vai in <strong style={{ color: C.text }}>Impostazioni → Connessioni</strong> e clicca <strong style={{ color: C.text }}>"Riconnetti Instagram"</strong> per ottenere un token fresco.</span>
                </div>
              )}

              {/* API NON DISPONIBILE */}
              {result.api_supported === false && !result.token_expired && (
                <div style={{ marginBottom: 12, padding: '10px 12px', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, fontSize: 12, color: C.warn, lineHeight: 1.6 }}>
                  ⚠️ <strong>Instagram non consente di importare questa conversazione</strong><br />
                  <span style={{ color: '#9CA3AF' }}>
                    Le conversazioni iniziate direttamente dall'app Instagram compariranno in Emaral <strong style={{ color: C.text }}>solo quando il cliente risponde</strong> e Meta invia il webhook.<br /><br />
                    Usa <strong style={{ color: C.ig }}>"Prepara contatto manuale"</strong> qui sotto per essere pronti a ricevere la risposta con ARIA disattivata.
                  </span>
                  {result.error_code && (
                    <div style={{ marginTop: 6, fontSize: 10, color: '#6B7280', fontFamily: 'monospace' }}>
                      Meta error {result.error_code}: {result.error_message}
                    </div>
                  )}
                </div>
              )}

              {/* MESSAGGIO SUCCESSO */}
              {result.success && (
                <div style={{ marginBottom: 10, fontSize: 12, color: result.imported > 0 ? C.success : C.muted, fontWeight: result.imported > 0 ? 700 : 400 }}>
                  {result.imported > 0
                    ? `✅ ${result.imported} messaggi importati da ${result.results?.filter(r => r.messages_imported > 0).length || 0} conversazioni.`
                    : 'Nessun messaggio nuovo — tutte le conversazioni erano già aggiornate.'}
                </div>
              )}

              {/* DETTAGLI TECNICI */}
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' }}>
                Dettagli tecnici
              </div>
              <DiagRow label="Account IG" value={result.ig_account_id || '—'} mono color="#60A5FA" />
              <DiagRow label="Endpoint" value={`graph.instagram.com/v21.0/{id}/conversations`} mono />
              <DiagRow label="API supportata" value={result.api_supported === false ? '❌ No' : result.api_supported === true ? '✅ Sì' : '—'} color={result.api_supported === false ? C.danger : C.success} />
              <DiagRow label="Token scaduto" value={result.token_expired ? '❌ Sì — riconnetti' : '✅ No'} color={result.token_expired ? C.danger : C.success} />
              <DiagRow label="Thread trovati" value={result.threads_found ?? '—'} color={result.threads_found > 0 ? C.success : C.muted} />
              <DiagRow label="Thread processati" value={result.threads_processed ?? '—'} />
              <DiagRow label="Messaggi importati" value={result.imported ?? '—'} color={result.imported > 0 ? C.success : C.muted} />
              <DiagRow label="Skippati" value={result.skipped ?? '—'} />
              {result.error_code && <DiagRow label="Errore Meta" value={`${result.error_code}: ${result.error_message}`} color={C.danger} />}
              {result._call_error && <DiagRow label="Errore chiamata" value={result._call_error} color={C.danger} />}

              {/* Dettaglio per thread */}
              {result.results?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>Conversazioni trovate</div>
                  {result.results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                      <span style={{ color: C.text }}>{r.sender}</span>
                      <span style={{ color: r.messages_imported > 0 ? C.success : C.muted }}>{r.messages_imported} msg importati</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SEPARATORE ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>OPPURE</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* ── FALLBACK: PREPARA CONTATTO MANUALE ── */}
        <div style={{ padding: '12px 14px', borderRadius: 12, background: `${C.ig}08`, border: `1px solid ${C.ig}30` }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: C.text, marginBottom: 5 }}>
            📸 Prepara contatto manuale
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 10 }}>
            Sai già lo <strong style={{ color: C.text }}>@username</strong> del cliente? Registralo ora per ricevere la sua risposta <strong style={{ color: C.ig }}>con ARIA disattivata</strong>.
          </div>
          <button
            onClick={onOpenManualModal}
            style={{
              width: '100%', padding: '9px', borderRadius: 10,
              background: '#DD2A7B18', border: '1px solid #DD2A7B40',
              color: C.ig, fontSize: 12, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <UserPlus size={13} /> Prepara contatto (ARIA off)
          </button>
        </div>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}