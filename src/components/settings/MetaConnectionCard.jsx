import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

function ChannelCard({ icon, title, connected, accountName, onToggle, onReconnect, toggling }) {
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
              {title === 'Facebook' ? 'Nessuna Pagina Facebook disponibile' : 'Nessun account Instagram Business collegato'}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: connected ? '#10B98120' : '#6B728020',
          color: connected ? '#10B981' : '#6B7280',
          border: `1px solid ${connected ? '#10B98140' : '#6B728040'}`,
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
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Disconnetti
          </button>
        ) : (
          <button
            onClick={() => onToggle(true)}
            disabled={toggling}
            style={{
              flex: 1, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: '#F0F4FF', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            {`Collega solo ${title}`}
          </button>
        )}
        <button
          onClick={onReconnect}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#9CA3AF', fontSize: 12,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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

  const startOAuth = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('startMetaOAuth', {});
    if (res.data?.url) {
      window.open(res.data.url, '_blank', 'width=600,height=700');
    }
    setLoading(false);
  };

  const toggleChannel = async (channel, value) => {
    setToggling(true);
    await base44.functions.invoke('updateMetaChannels', {
      [channel === 'fb' ? 'fb_connected' : 'ig_connected']: value,
    });
    await onRefresh();
    setToggling(false);
  };

  const connectBoth = async () => {
    setLoading(true);
    await base44.functions.invoke('updateMetaChannels', { fb_connected: true, ig_connected: true });
    await onRefresh();
    setLoading(false);
  };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={startOAuth} disabled={loading} style={btnStyle('#3B6EF8')}>
            {loading ? 'Apertura...' : '🔗 Connetti Facebook'}
          </button>
          <button onClick={startOAuth} disabled={loading} style={btnStyle('#E1306C')}>
            {loading ? 'Apertura...' : '📸 Connetti Instagram'}
          </button>
        </div>
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
        <button onClick={startOAuth} disabled={loading} style={{
          padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#9CA3AF', fontSize: 11, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>
          {loading ? '...' : 'Riautentica'}
        </button>
      </div>

      {/* FB Card */}
      <ChannelCard
        icon="📘"
        title="Facebook"
        connected={connection.fb_connected && fbAvailable}
        accountName={connection.fb_page_name}
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
        onToggle={(val) => toggleChannel('ig', val && igAvailable)}
        onReconnect={startOAuth}
        toggling={toggling}
      />

      {/* Connect both shortcut */}
      {fbAvailable && igAvailable && (!connection.fb_connected || !connection.ig_connected) && (
        <button onClick={connectBoth} disabled={loading} style={btnStyle('#3B6EF8')}>
          🔗 Collega entrambi
        </button>
      )}

      {/* Warnings */}
      {!fbAvailable && (
        <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ Nessuna Pagina Facebook disponibile sul tuo account Meta.
        </div>
      )}
      {!igAvailable && (
        <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '8px 12px' }}>
          ⚠️ Nessun account Instagram Business collegato alla tua Pagina Facebook.
        </div>
      )}
    </div>
  );
}

const btnStyle = (color) => ({
  width: '100%', padding: '10px 16px', borderRadius: 10,
  border: `1px solid ${color}44`, background: `${color}18`,
  color: '#F0F4FF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
});