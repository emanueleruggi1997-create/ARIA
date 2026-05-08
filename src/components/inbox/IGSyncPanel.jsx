/**
 * IGSyncPanel — pannello laterale per la sincronizzazione conversazioni Instagram.
 * Spiega i limiti Meta API e offre sync + fallback "Prepara contatto manuale".
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, UserPlus, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', ig: '#DD2A7B',
  success: '#00E5A0', warn: '#F59E0B', danger: '#EF4444', accent: '#7000FF',
};

export default function IGSyncPanel({ businessId, onClose, onSyncDone, onOpenManualModal }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null); // { success, api_supported, message, meta_limitation, imported, ... }

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncInstagramConversations', {});
      setResult(res.data || {});
      if (res.data?.success && res.data?.imported > 0) {
        onSyncDone?.();
      }
    } catch (e) {
      setResult({ success: false, error_message: e.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{
      width: 360, height: '100%', background: C.surface,
      borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#F58529,#DD2A7B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RefreshCw size={14} style={{ color: '#fff' }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text, flex: 1 }}>Sincronizza Instagram</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: 2, display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── INFO META LIMITATION ── */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: '#F59E0B08', border: `1px solid #F59E0B30`,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={14} style={{ color: C.warn, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontWeight: 800, fontSize: 12, color: C.warn }}>Limite API Meta</span>
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.7 }}>
            I messaggi inviati <strong style={{ color: C.text }}>direttamente dall'app Instagram</strong> (fuori da Emaral) <strong style={{ color: '#F87171' }}>non sono recuperabili via API</strong> — Meta non li espone.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', lineHeight: 1.7 }}>
            Le conversazioni appaiono in Emaral <strong style={{ color: C.text }}>solo quando il cliente risponde</strong> e Meta invia il webhook a Emaral.
          </div>
        </div>

        {/* ── COSA FA LA SYNC ── */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: `${C.accent}08`, border: `1px solid ${C.accent}30`,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Info size={14} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontWeight: 800, fontSize: 12, color: '#60A5FA' }}>Cosa fa la sincronizzazione</span>
          </div>
          <ul style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
            <li>Recupera i thread Instagram già accessibili via API</li>
            <li>Importa messaggi mancanti (es. dopo reset dati)</li>
            <li>Aggiorna nomi contatti anonimi con @username reale</li>
            <li>Distingue messaggi <em>inbound</em> (cliente) da <em>outbound</em> (ARIA/business)</li>
          </ul>
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
            opacity: syncing ? 0.7 : 1, transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizzazione in corso...' : '🔄 Sincronizza conversazioni Instagram'}
        </button>

        {/* ── RISULTATO SYNC ── */}
        {result && (
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: result.success ? `${C.success}08` : '#EF444408',
            border: `1px solid ${result.success ? C.success + '40' : '#EF444440'}`,
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {result.success
                ? <CheckCircle size={14} style={{ color: C.success, flexShrink: 0, marginTop: 2 }} />
                : <AlertTriangle size={14} style={{ color: C.danger, flexShrink: 0, marginTop: 2 }} />
              }
              <span style={{ fontWeight: 800, fontSize: 12, color: result.success ? C.success : C.danger }}>
                {result.success ? 'Sincronizzazione completata' : 'Errore sincronizzazione'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
              {result.message || result.error_message}
            </div>
            {result.token_expired && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.danger, background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 10px', lineHeight: 1.6 }}>
                🔑 <strong>Token scaduto</strong> — Vai in <strong>Impostazioni → Connessioni</strong> e riconnetti Instagram per rinnovare il token.
              </div>
            )}
            {result.api_supported === false && !result.token_expired && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.warn, background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 10px', lineHeight: 1.6 }}>
                ⚠️ <strong>API non disponibile</strong> — {result.error_message || 'Meta non espone questi dati per questo tipo di token.'}
              </div>
            )}
            {result.meta_limitation && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
                👉 Usa <strong style={{ color: C.ig }}>"Prepara contatto manuale"</strong> qui sotto per gestire le conversazioni avviate fuori da Emaral.
              </div>
            )}
            {result.success && result.imported > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: C.success }}>
                ✅ {result.imported} messaggi importati da {result.results?.filter(r => r.messages_imported > 0).length || 0} conversazioni.
              </div>
            )}
          </div>
        )}

        {/* ── SEPARATORE ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OPPURE</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* ── FALLBACK: PREPARA CONTATTO MANUALE ── */}
        <div style={{
          padding: '14px', borderRadius: 12,
          background: `${C.ig}08`, border: `1px solid ${C.ig}30`,
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 6 }}>
            📸 Prepara contatto manuale
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 12 }}>
            Se hai già scritto su Instagram e sai lo <strong style={{ color: C.text }}>@username</strong> del cliente:
            registralo ora per preparare Emaral a ricevere la sua risposta <strong style={{ color: C.ig }}>con ARIA disattivata</strong>.
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', background: '#0F172A', borderRadius: 8, padding: '8px 12px', marginBottom: 12, lineHeight: 1.6 }}>
            Quando il cliente risponde, il webhook arriverà e il messaggio comparirà in questa conversazione senza che ARIA risponda automaticamente.
          </div>
          <button
            onClick={() => { onClose(); onOpenManualModal(); }}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
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