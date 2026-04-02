import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const IG_COLOR = '#E1306C';

function formatTokenExpiry(connectedAt) {
  if (!connectedAt) return null;
  const expiry = new Date(connectedAt);
  expiry.setDate(expiry.getDate() + 60);
  const now = new Date();
  const daysLeft = Math.round((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'Token scaduto', color: '#EF4444' };
  if (daysLeft < 7) return { label: `Token scade tra ${daysLeft} giorni`, color: '#F59E0B' };
  return { label: `Token valido fino al ${expiry.toLocaleDateString('it-IT')}`, color: '#10B981' };
}

export default function MetaConnectionCard({ connection, businessId, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const pollRef = useRef(null);

  const igConnected = connection?.ig_connected && !!connection?.ig_account_id;
  const tokenInfo = formatTokenExpiry(connection?.connected_at);

  const startOAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('startMetaOAuth', { type: 'instagram' });
      if (!res.data?.url) {
        setError('Impossibile avviare la connessione. Riprova.');
        setLoading(false);
        return;
      }
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
      clearInterval(pollRef.current);

      const popup = window.open(res.data.url, 'ig_oauth', 'width=620,height=700,left=100,top=100');
      popupRef.current = popup;
      setLoading(false);

      if (!popup) {
        setError('Il popup è stato bloccato. Consenti i popup per questo sito e riprova.');
        return;
      }
      pollRef.current = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollRef.current);
          await onRefresh();
        }
      }, 800);
    } catch (err) {
      console.error('[MetaConnectionCard] startOAuth error:', err);
      setError('Errore durante la connessione. Riprova.');
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (disconnecting || !connection?.id) return;
    setDisconnecting(true);
    try {
      await base44.entities.MetaConnection.update(connection.id, { ig_connected: false });
      await onRefresh();
    } catch (err) {
      setError('Errore durante la disconnessione.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div style={{
      background: '#0F1219',
      border: `1px solid ${igConnected ? '#10B98140' : 'rgba(255,255,255,0.08)'}`,
      borderLeft: `3px solid ${IG_COLOR}`,
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* IG Icon */}
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F58529,#E1306C,#833AB4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
            <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1" fill="white"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF', display: 'flex', alignItems: 'center', gap: 8 }}>
            Instagram Business
            {igConnected && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#10B98120', color: '#10B981', border: '1px solid #10B98140', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Connesso
              </span>
            )}
          </div>
          {igConnected ? (
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>@{connection.ig_account_name}</div>
          ) : (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Nessun account collegato</div>
          )}
        </div>
      </div>

      {igConnected && tokenInfo && (
        <div style={{ marginTop: 10, fontSize: 11, color: tokenInfo.color, background: `${tokenInfo.color}10`, border: `1px solid ${tokenInfo.color}30`, borderRadius: 8, padding: '6px 10px' }}>
          🔑 {tokenInfo.label}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#EF4444', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        {igConnected ? (
          <>
            <button onClick={startOAuth} disabled={loading} style={btnStyle('rgba(255,255,255,0.08)', '#9CA3AF', loading)}>
              {loading ? '⏳ Apertura...' : '🔄 Riconnetti'}
            </button>
            <button onClick={disconnect} disabled={disconnecting} style={btnStyle('#EF444420', '#EF4444', disconnecting)}>
              {disconnecting ? '...' : 'Disconnetti'}
            </button>
          </>
        ) : (
          <button onClick={startOAuth} disabled={loading} style={btnStyle(`${IG_COLOR}20`, '#F0F4FF', loading, IG_COLOR)}>
            {loading ? <span>⏳ Apertura...</span> : <span>📸 Collega Instagram Business</span>}
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle = (bg, color, disabled, borderColor) => ({
  flex: 1, padding: '9px 14px', borderRadius: 9,
  border: `1px solid ${borderColor || 'rgba(255,255,255,0.1)'}`,
  background: disabled ? 'rgba(255,255,255,0.03)' : bg,
  color: disabled ? '#6B7280' : color,
  fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.2s',
});