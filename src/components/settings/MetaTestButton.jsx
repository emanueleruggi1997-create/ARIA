import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function MetaTestButton({ connection, ariaColor, onTestSuccess }) {
  const { lang } = useLang();
  const [testing, setTesting] = useState(false);
  const [result, setResult]   = useState(null);

  const handleTest = async () => {
    if (testing || !connection?.id) return;
    setTesting(true);
    setResult(null);

    try {
      const res = await Promise.race([
        base44.functions.invoke('testMetaConnection', { connector_id: connection.id }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000)),
      ]);

      const data = res.data || {};
      if (data.success) {
        setResult({ success: true, account_name: data.account_name, account_type: data.account_type });
        if (onTestSuccess) onTestSuccess({ username: data.resolved_username || data.account_name });
      } else if (data.connectionOperative || data.scopesOk) {
        // Token e scopes validi ma profilo non recuperabile
        // NON affermare che ARIA funziona — solo OAuth verificato
        setResult({
          success: 'oauth_only',
          detail: data.error,
          endpoint: data.endpoint_called,
        });
        if (onTestSuccess) onTestSuccess({ username: null });
      } else {
        setResult({ success: false, error: data.error || 'Test fallito', raw: data.raw });
      }
    } catch (e) {
      // Fallback: controlla scadenza token da DB
      const expiryDate = connection.ig_token_expires_at ? new Date(connection.ig_token_expires_at) : null;
      const isExpired  = expiryDate && expiryDate < new Date();
      if (isExpired) {
        setResult({ success: false, error: 'Token scaduto — riconnetti' });
      } else {
        // Non riusciamo a testare (network/timeout) ma il token non è scaduto
        setResult({ success: null, error: `Test non completato: ${e.message}` });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleTest}
        disabled={testing || !connection?.id}
        className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
        style={{
          background: testing ? 'rgba(255,255,255,0.05)' : `${ariaColor}20`,
          color: testing ? '#6B7280' : ariaColor,
          border: `1px solid ${ariaColor}30`,
          cursor: testing ? 'not-allowed' : 'pointer',
        }}
      >
        {testing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {lang === 'en' ? 'Testing...' : 'Test in corso...'}
          </span>
        ) : (
          <span>🧪 {lang === 'en' ? 'Test Connection' : 'Testa Connessione'}</span>
        )}
      </button>

      {result && (
        <div
          className="rounded-lg p-3 text-sm border"
          style={{
            background: result.success === true ? '#10B98110' : result.success === 'oauth_only' ? '#F59E0B10' : result.success === null ? '#F59E0B10' : '#EF444410',
            border: `1px solid ${result.success === true ? '#10B98140' : result.success === 'oauth_only' ? '#F59E0B40' : result.success === null ? '#F59E0B40' : '#EF444440'}`,
            color: result.success === true ? '#10B981' : result.success === 'oauth_only' ? '#F59E0B' : result.success === null ? '#F59E0B' : '#EF4444',
          }}
        >
          <div className="flex items-start gap-2">
            {result.success === true
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <div className="w-full">
              {result.success === true ? (
                <div className="space-y-1">
                  <p className="font-semibold">✅ OAuth valido{result.account_name ? ` · ${result.account_name}` : ''}</p>
                  <p className="text-xs opacity-80">Token e scopes verificati. Controlla la diagnostica per Webhook e ARIA.</p>
                </div>
              ) : result.success === 'oauth_only' ? (
                <div className="space-y-1">
                  <p className="font-semibold">⚠️ OAuth valido — profilo non recuperato</p>
                  <p className="text-xs opacity-80">Token e scopes presenti. Profilo Instagram non accessibile via API.</p>
                  {result.detail && <p className="text-xs opacity-60 mt-1">{result.detail}</p>}
                  <p className="text-xs opacity-50 mt-1">Webhook e ARIA: verifica la sezione diagnostica qui sopra.</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">{result.success === null ? 'Test incompleto' : 'Test fallito'}</p>
                  <p className="text-xs opacity-80 mt-1">{result.error}</p>
                  {result.raw && <p className="text-xs opacity-50 mt-1 break-all font-mono">{JSON.stringify(result.raw)}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}