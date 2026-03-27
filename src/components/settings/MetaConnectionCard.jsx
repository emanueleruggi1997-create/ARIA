import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

function ChannelCard({ icon, title, connected, accountName, onToggle, onReconnect, toggling, notAvailableMsg }) {
  return (
    <div style={{
      background: '#0F1219',
      border: `1px solid ${connected ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF' }}>{title}</div>
          {connected && accountName ? (
            <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>✓ {accountName}</div>
          ) : (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              {notAvailableMsg || `Nessun account ${title} collegato`}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: connected ? '#10B98120' : '#6B728020',
          color: connected ? '#10B981' : '#6B7280',
          border: `1px solid ${connected ? '#10B98140' : '#6B728040'}`,
          whiteSpace: 'nowrap',
        }}>
          {connected ? 'Collegato' : 'Non collegato'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {connected ? (
          <button
            onClick={() => onToggle(false)}
            disabled={toggling}
            style={{
              flex: 1, padding: '7px 14px', borderRadius: 8, border: '1px solid #EF444440',
              background: '#EF444410', color: '#EF4444', fontSize: 12, fontWeight: 600,
              cursor: toggling ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
              opacity: toggling ? 0.6 : 1,
            }}
          >
            {toggling ? '...' : 'Disconnetti'}
          </button>
        ) : (
          <button
            onClick={() => onToggle(true)}
            disabled={toggling}
            style={{
              flex: 1, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: '#F0F4FF', fontSize: 12, fontWeight: 600,
              cursor: toggling ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
              opacity: toggling ? 0.6 : 1,
            }}
          >
            {toggling ? '...' : `Collega solo ${title}`}
          </button>
        )}
        <button
          onClick={onReconnect}
          disabled={toggling}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#9CA3AF', fontSize: 12,
            cursor: toggling ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Riconnetti
        </button>
      </div>
    </div>
  );
}

export default function MetaConnectionCard({ connection, businessId, onRefresh }) {
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const pollRef = useRef(null);

  // Open OAuth popup and poll for close → auto-refresh
  const startOAuth = async () => {
    if (loading) return; // prevent double open
    setError(null);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('startMetaOAuth', {});
      if (!res.data?.url) {
        setError('Impossibile avviare la connessione Meta. Riprova.');
        setLoading(false);
        return;
      }

      // Close any existing popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      clearInterval(pollRef.current);

      const popup = window.open(res.data.url, 'meta_oauth', 'width=620,height=700,left=100,top=100');
      popupRef.current = popup;
      setLoading(false);

      if (!popup) {
        setError('Il popup è stato bloccato. Consenti i popup per questo sito e riprova.');
        return;
      }

      // Poll until popup closes, then refresh
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

  const toggleChannel = async (channel, value) => {
    if (toggling) return;
    setError(null);
    setToggling(true);
    try {
      await base44.functions.invoke('updateMetaChannels', {
        [channel === 'fb' ? 'fb_connected' : 'ig_connected']: value,
      });
      await onRefresh();
    } catch (err) {
      console.error('[MetaConnectionCard] toggleChannel error:', err);
      setError('Errore durante l\'aggiornamento. Riprova.');
    } finally {
      setToggling(false);
    }
  };

  const connectBoth = async () => {
    if (loading || toggling) return;
    setError(null);
    setLoading(true);
    try {
      await base44.functions.invoke('updateMetaChannels', { fb_connected: true, ig_connected: true });
      await onRefresh();
    } catch (err) {
      console.error('[MetaConnectionCard] connectBoth error:', err);
      setError('Errore durante la connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const isActing = loading || toggling;

  // No connection at all
  if (!connection) {
    return (
      <div style={{
        background: '#0F1219', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF' }}>📱 Meta (Facebook & Instagram)</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          Connetti il tuo account Meta per pubblicare su Facebook e Instagram.
        </div>
        {error && (
          <div style={{ fontSize: 11, color: '#EF4444', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 12px' }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={startOAuth} disabled={isActing} style={btnStyle('#3B6EF8', isActing)}>
            {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Apertura...
            </span> : '🔗 Connetti Facebook & Instagram'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fbAvailable = !!connection.fb_page_id;
  const igAvailable = !!connection.ig_account_id;

  return (
    <div style={{
      background: '#0F1219', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>📱</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF' }}>Meta</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Connesso come {connection.meta_user_name}</div>
        </div>
        <button onClick={startOAuth} disabled={isActing} style={{
          padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: isActing ? '#6B7280' : '#9CA3AF', fontSize: 11,
          cursor: isActing ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
          {loading ? '...' : 'Riautentica'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ fontSize: 11, color: '#EF4444', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* FB Card */}
      <ChannelCard
        icon="📘"
        title="Facebook"
        connected={connection.fb_connected && fbAvailable}
        accountName={connection.fb_page_name}
        notAvailableMsg={fbAvailable ? 'Non collegato' : 'Nessuna Pagina Facebook disponibile'}
        onToggle={(val) => toggleChannel('fb', val && fbAvailable)}
        onReconnect={startOAuth}
        toggling={toggling}
      />

      {/* IG Card */}
      <ChannelCard
        icon="📸"
        title="Instagram"
        connected={connection.ig_connected && igAvailable}
        accountName={connection.ig_account_name}
        notAvailableMsg={igAvailable ? 'Non collegato' : 'Nessun account Instagram Business trovato'}
        onToggle={(val) => toggleChannel('ig', val && igAvailable)}
        onReconnect={startOAuth}
        toggling={toggling}
      />

      {/* Connect both shortcut */}
      {fbAvailable && igAvailable && (!connection.fb_connected || !connection.ig_connected) && (
        <button onClick={connectBoth} disabled={isActing} style={btnStyle('#3B6EF8', isActing)}>
          {loading ? '...' : '🔗 Collega entrambi'}
        </button>
      )}

      {/* Warnings */}
      {!fbAvailable && (
        <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ Nessuna Pagina Facebook disponibile. Assicurati di avere una Pagina Facebook collegata al tuo account.
        </div>
      )}
      {!igAvailable && (
        <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ Nessun account Instagram Business trovato. Collega il tuo profilo Instagram alla Pagina Facebook.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const btnStyle = (color, disabled) => ({
  width: '100%', padding: '10px 16px', borderRadius: 10,
  border: `1px solid ${color}44`, background: disabled ? 'rgba(255,255,255,0.03)' : `${color}18`,
  color: disabled ? '#6B7280' : '#F0F4FF', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
});