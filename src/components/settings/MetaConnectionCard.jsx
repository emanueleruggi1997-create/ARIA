import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';
import MetaTestButton from './MetaTestButton';

const IG_COLOR = '#E1306C';

function formatTokenExpiry(connection, lang) {
  let expiry;
  if (connection?.ig_token_expires_at) {
    expiry = new Date(connection.ig_token_expires_at);
  } else if (connection?.connected_at) {
    expiry = new Date(connection.connected_at);
    expiry.setDate(expiry.getDate() + 60);
  } else {
    return null;
  }
  const now      = new Date();
  const daysLeft = Math.round((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: lang === 'en' ? 'Token expired' : 'Token scaduto', color: '#EF4444' };
  if (daysLeft < 7) return { label: lang === 'en' ? `Expires in ${daysLeft} days` : `Scade tra ${daysLeft} giorni`, color: '#F59E0B' };
  return { label: lang === 'en' ? `Valid until ${expiry.toLocaleDateString('en-GB')}` : `Valido fino al ${expiry.toLocaleDateString('it-IT')}`, color: '#10B981' };
}

function StatusRow({ icon, color, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#9CA3AF' }}>
      <span style={{ color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
        {detail && <span style={{ color: '#6B7280', marginLeft: 4 }}>{detail}</span>}
      </div>
    </div>
  );
}

export default function MetaConnectionCard({ connection, businessId, onRefresh }) {
  const { lang } = useLang();
  const [loading, setLoading]           = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [resolvingName, setResolvingName] = useState(false);
  const [resolveMsg, setResolveMsg]     = useState(null);
  const [error, setError]               = useState(null);
  const popupRef = useRef(null);
  const pollRef  = useRef(null);

  const igConnected    = connection?.ig_connected && !!connection?.ig_account_id;
  const tokenInfo      = formatTokenExpiry(connection, lang);
  const tokenExpired   = tokenInfo?.color === '#EF4444';
  const rawName        = connection?.ig_account_name || connection?.meta_user_name || '';
  const igAccountName  = rawName && !/^\d+$/.test(rawName) ? rawName : '';
  const igProfilePic   = connection?.ig_profile_picture_url || '';
  const hasUsername    = !!igAccountName;
  // Considera gli scope presenti se: has_basic_scope=true, OPPURE granted_scopes li contiene
  // (evita falsi negativi quando /me fallisce ma gli scope sono stati concessi)
  const grantedScopes  = connection?.granted_scopes || '';
  const hasBasicScope  = igConnected && (connection?.has_basic_scope === true || grantedScopes.includes('instagram_business_basic'));
  const hasMsgScope    = igConnected && (connection?.has_messages_scope === true || grantedScopes.includes('instagram_business_manage_messages'));
  const syncError      = connection?.sync_error || '';

  const startOAuth = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('startMetaOAuth', { businessId });
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
        setError('Popup bloccato. Consenti i popup per questo sito e riprova.');
        return;
      }
      pollRef.current = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollRef.current);
          await onRefresh();
        }
      }, 800);
    } catch (err) {
      setError('Errore durante la connessione. Riprova.');
      setLoading(false);
    }
  };

  const resolveUsername = async () => {
    if (resolvingName) return;
    setResolvingName(true);
    setResolveMsg(null);
    try {
      const res = await base44.functions.invoke('resolveIGUsername', {});
      if (res.data?.success) {
        setResolveMsg({ ok: true, text: `✅ @${res.data.resolvedName}` });
        await onRefresh();
      } else {
        setResolveMsg({ ok: false, text: res.data?.message || 'Impossibile recuperare lo username.' });
      }
    } catch (e) {
      setResolveMsg({ ok: false, text: e.message });
    } finally {
      setResolvingName(false);
    }
  };

  const disconnect = async () => {
    if (disconnecting || !connection?.id) return;
    setDisconnecting(true);
    try {
      await base44.entities.MetaConnection.update(connection.id, { ig_connected: false, fb_connected: false });
      await onRefresh();
    } catch {
      setError('Errore durante la disconnessione.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div style={{ background: '#0F1219', border: `1px solid ${igConnected ? '#10B98140' : 'rgba(255,255,255,0.08)'}`, borderLeft: `3px solid ${IG_COLOR}`, borderRadius: 14, padding: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F58529,#E1306C,#833AB4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
            <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1" fill="white"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Instagram Business
            {igConnected && !tokenExpired && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#10B98120', color: '#10B981', border: '1px solid #10B98140' }}>
                ● {lang === 'en' ? 'Connected' : 'Connesso'}
              </span>
            )}
            {igConnected && tokenExpired && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}>
                ● {lang === 'en' ? 'Token expired' : 'Token scaduto'}
              </span>
            )}
          </div>

          {igConnected ? (
            <div style={{ fontSize: 12, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              {igProfilePic && <img src={igProfilePic} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />}
              {hasUsername
                ? <span style={{ color: '#9CA3AF' }}>@{igAccountName}</span>
                : <span style={{ color: '#6B7280', fontStyle: 'italic' }}>ID: {connection?.ig_account_id}</span>
              }
              {connection?.connected_at && (
                <span style={{ color: '#4B5563', fontSize: 11 }}>· dal {new Date(connection.connected_at).toLocaleDateString('it-IT')}</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Nessun account collegato</div>
          )}
        </div>
      </div>

      {/* Token expiry */}
      {igConnected && tokenInfo && (
        <div style={{ marginTop: 10, fontSize: 11, color: tokenInfo.color, background: `${tokenInfo.color}10`, border: `1px solid ${tokenInfo.color}30`, borderRadius: 8, padding: '6px 10px' }}>
          🔑 {tokenInfo.label}
          {tokenExpired && <span style={{ display: 'block', color: '#9CA3AF', marginTop: 2 }}>Riconnetti per continuare</span>}
        </div>
      )}

      {/* Status checks */}
      {igConnected && (
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', marginBottom: 2, letterSpacing: 1 }}>STATO CONNESSIONE</div>

          <StatusRow
            icon={hasUsername ? '✅' : '⚠️'}
            color={hasUsername ? '#10B981' : '#F59E0B'}
            label={hasUsername ? `@${igAccountName}` : 'Username da sincronizzare'}
            detail={null}
          />

          <StatusRow
            icon={hasBasicScope ? '✅' : '❌'}
            color={hasBasicScope ? '#10B981' : '#EF4444'}
            label="instagram_business_basic"
            detail={!hasBasicScope ? '— Riconnetti accettando tutti i permessi' : null}
          />

          <StatusRow
            icon={hasMsgScope ? '✅' : '❌'}
            color={hasMsgScope ? '#10B981' : '#EF4444'}
            label="instagram_business_manage_messages"
            detail={!hasMsgScope ? '— Riconnetti accettando tutti i permessi' : null}
          />

          {connection?.granted_scopes && (
            <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>
              Scopes: {connection.granted_scopes}
            </div>
          )}
        </div>
      )}

      {/* Avviso scope mancante — solo se NON presente in granted_scopes */}
      {igConnected && !hasBasicScope && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ Permesso <strong>instagram_business_basic</strong> mancante. Riconnetti accettando tutti i permessi.
        </div>
      )}

      {/* Username non recuperato — mostra sync pulsante solo se effettivamente mancante */}
      {igConnected && !hasUsername && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#6B7280', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>Username non ancora sincronizzato.</span>
          <button onClick={resolveUsername} disabled={resolvingName} style={smallBtn}>
            {resolvingName ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
            {resolvingName ? '...' : 'Sincronizza'}
          </button>
        </div>
      )}

      {/* Sync error — mostra solo se username ancora mancante (altrimenti errore era transitorio) */}
      {igConnected && syncError && !hasUsername && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px' }}>
          ℹ️ {syncError}
        </div>
      )}

      {resolveMsg && (
        <div style={{ marginTop: 8, fontSize: 11, color: resolveMsg.ok ? '#10B981' : '#EF4444', background: resolveMsg.ok ? '#10B98110' : '#EF444410', border: `1px solid ${resolveMsg.ok ? '#10B98130' : '#EF444430'}`, borderRadius: 8, padding: '7px 12px' }}>
          {resolveMsg.text}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#EF4444', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {igConnected && <MetaTestButton connection={connection} ariaColor={IG_COLOR} />}
        <div style={{ display: 'flex', gap: 8 }}>
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
              {loading ? '⏳ Apertura...' : '📸 Collega Instagram Business'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

if (typeof document !== 'undefined' && !document.getElementById('meta-card-spin')) {
  const s = document.createElement('style');
  s.id = 'meta-card-spin';
  s.textContent = '@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }';
  document.head.appendChild(s);
}

const smallBtn = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: '#9CA3AF', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
};

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