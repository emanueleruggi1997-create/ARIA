import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function MetaTestButton({ connection, ariaColor }) {
  const { lang } = useLang();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    if (testing || !connection?.id) return;
    
    setTesting(true);
    setResult(null);

    try {
      const res = await base44.functions.invoke('testMetaConnection', {
        connector_id: connection.id
      });
      
      if (res.data?.success) {
        setResult({
          success: true,
          token_valid: true,
          account_name: res.data.account_name,
          webhook_subscribed: res.data.webhook_subscribed,
        });
      } else {
        setResult({
          success: false,
          error: res.data?.error || 'Test failed'
        });
      }
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleTest}
        disabled={testing || !connection?.access_token}
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
            background: result.success ? '#10B98110' : '#EF444410',
            border: `1px solid ${result.success ? '#10B98140' : '#EF444440'}`,
            color: result.success ? '#10B981' : '#EF4444',
          }}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div>
              {result.success ? (
                <div className="space-y-1">
                  <p className="font-semibold">✅ {lang === 'en' ? 'All checks passed' : 'Tutti i test superati'}</p>
                  <p className="text-xs opacity-80">
                    {lang === 'en' ? 'Token valid' : 'Token valido'} • {result.account_name}
                  </p>
                  <p className="text-xs opacity-80">
                    {result.webhook_subscribed
                      ? lang === 'en' ? '✓ Webhook subscribed' : '✓ Webhook sottoscritto'
                      : lang === 'en' ? '⚠ Webhook not subscribed' : '⚠ Webhook non sottoscritto'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">{lang === 'en' ? 'Test failed' : 'Test fallito'}</p>
                  <p className="text-xs opacity-80 mt-1">{result.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}