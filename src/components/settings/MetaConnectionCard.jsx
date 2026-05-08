import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';
import MetaTestButton from './MetaTestButton';
import MetaConnectionStatus from './MetaConnectionStatus';

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
  // Runtime state: sovrascrive i valori DB stale dopo sync/test positivo
  const [runtimeUsername, setRuntimeUsername] = useState(null); // null = usa DB
  const [runtimeScopesOk, setRuntimeScopesOk] = useState(null); // null = usa DB
  const [runtimeTestOk, setRuntimeTestOk]     = useState(null); // null = non testato
  const popupRef = useRef(null);
  const pollRef  = useRef(null);

  // Error 190 = token invalidato da Meta (Session has expired) — richiede OAuth completo
  const isError190     = (connection?.sync_error || '').includes('token_expired_190') ||
                         (connection?.refresh_error || '').includes('error_190') ||
                         connection?.status === 'error';
  const igConnected    = connection?.ig_connected && !!connection?.ig_account_id && !isError190;
  const tokenInfo      = formatTokenExpiry(connection, lang);
  const tokenExpired   = tokenInfo?.color === '#EF4444' || isError190;
  const rawName        = runtimeUsername ?? (connection?.ig_account_name || connection?.meta_user_name || '');
  const igAccountName  = rawName && !/^\d+$/.test(rawName) ? rawName : '';
  const igProfilePic   = connection?.ig_profile_picture_url || '';
  const hasUsername    = !!igAccountName;
  // Scope: usa stato runtime se disponibile, altrimenti DB + granted_scopes
  const grantedScopes  = connection?.granted_scopes || '';
  const dbBasicScope   = connection?.has_basic_scope === true || grantedScopes.includes('instagram_business_basic');
  const dbMsgScope     = connection?.has_messages_scope === true || grantedScopes.includes('instagram_business_manage_messages');
  const hasBasicScope  = igConnected && (runtimeScopesOk ?? dbBasicScope);
  const hasMsgScope    = igConnected && (runtimeScopesOk ?? dbMsgScope);
  // Mostra sync_error solo se test NON è OK in runtime E non abbiamo username valido
  const syncError      = (runtimeTestOk === true || hasUsername) ? '' : (connection?.sync_error || '');

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
          // Refresh DB e poi esegui test API automatico
          await onRefresh();
          // Breve delay per attendere che il DB sia aggiornato
          setTimeout(async () => {
            await onRefresh();
            // Trigger test automatico dopo reconnessione (se la card ha la funzione)
            setResolveMsg({ ok: true, text: '✅ OAuth completato — test API in corso...' });
            try {
              const conn = await base44.entities.MetaConnection.filter({ user_id: (await base44.auth.me())?.id });
              if (conn?.[0]?.id) {
                const testRes = await base44.functions.invoke('testMetaConnection', { connector_id: conn[0].id });
                const d = testRes.data || {};
                if (d.success) {
                  setRuntimeUsername(d.account_name || null);
                  setRuntimeScopesOk(true);
                  setRuntimeTestOk(true);
                  setResolveMsg({ ok: true, text: `✅ Connessione verificata — @${d.account_name || d.account_id} — token valido` });
                } else {
                  const errCode = d.results?.profile?.error?.code;
                  if (errCode === 190) {
                    setResolveMsg({ ok: false, text: '⚠️ Token scaduto (error 190) — riconnetti di nuovo' });
                  } else {
                    setResolveMsg({ ok: false, text: `⚠️ Test API: ${d.results?.profile?.error?.message || 'errore sconosciuto'}` });
                  }
                }
                await onRefresh();
              }
            } catch (e) {
              setResolveMsg({ ok: false, text: `Test automatico fallito: ${e.message}` });
            }
          }, 2000);
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
      const data = res.data || {};
      if (data.success) {
        if (data.username || data.resolvedName) {
          setRuntimeUsername(data.username || data.resolvedName);
        }
        setRuntimeScopesOk(true);
        setRuntimeTestOk(true);
        setResolveMsg({ ok: true, text: `✅ Connessione verificata${data.username ? ' — @' + data.username : ''}` });
        await onRefresh();
      } else if (data.scopesOk || data.connectionOperative) {
        // Token e scopes presenti in DB — ma non verificati tramite API reale
        setResolveMsg({ ok: false, text: '⚠️ Scopes salvati in DB, ma chiamata API Meta fallita. Verifica la diagnostica: instagram_business_basic potrebbe non essere approvato in App Review.' });
        await onRefresh();
      } else {
        setResolveMsg({ ok: false, text: data.message || 'Impossibile recuperare lo username.' });
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

      {/* Banner ERROR 190 — molto visibile */}
      {isError190 && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#EF444415', border: '1.5px solid #EF4444', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#EF4444', marginBottom: 4 }}>
            ⚠️ TOKEN META SCADUTO — Error 190
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
            Il token Instagram è stato invalidato da Meta (<code style={{ color: '#F87171', fontSize: 11 }}>Session has expired</code>).
            ARIA non risponde, i webhook non arrivano, l'Inbox è bloccata.
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>
            👉 Clicca <strong style={{ color: '#EF4444' }}>Riconnetti Instagram</strong> qui sotto per eseguire un OAuth completo e ottenere un token fresco.
          </div>
          {connection?.refresh_error && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#6B7280', fontFamily: 'monospace', background: '#0F172A', padding: '4px 8px', borderRadius: 6 }}>
              {connection.refresh_error.slice(0, 200)}
            </div>
          )}
        </div>
      )}

      {/* Token expiry */}
      {(igConnected || (connection?.ig_connected && !isError190)) && tokenInfo && (
        <div style={{ marginTop: 10, fontSize: 11, color: tokenInfo.color, background: `${tokenInfo.color}10`, border: `1px solid ${tokenInfo.color}30`, borderRadius: 8, padding: '6px 10px' }}>
          🔑 {tokenInfo.label}
          {tokenExpired && <span style={{ display: 'block', color: '#9CA3AF', marginTop: 2 }}>Riconnetti per continuare</span>}
        </div>
      )}

      {/* Pannello diagnostica veritiero — mostra stato reale OAuth / Webhook / ARIA */}
      {(igConnected || isError190) && (
        <MetaConnectionStatus connection={connection} businessId={connection?.business_id} />
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
        {igConnected && !isError190 && (
          <MetaTestButton
            connection={connection}
            ariaColor={IG_COLOR}
            onTestSuccess={({ username }) => {
              if (username) setRuntimeUsername(username);
              setRuntimeScopesOk(true);
              setRuntimeTestOk(true);
              onRefresh();
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(igConnected || isError190) ? (
            <>
              <button onClick={startOAuth} disabled={loading} style={btnStyle(
                isError190 ? '#EF444430' : 'rgba(255,255,255,0.08)',
                isError190 ? '#EF4444' : '#9CA3AF',
                loading,
                isError190 ? '#EF444460' : undefined
              )}>
                {loading ? '⏳ Apertura popup...' : isError190 ? '🔄 Riconnetti Instagram (OAuth nuovo)' : '🔄 Riconnetti'}
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