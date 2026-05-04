import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function MetaTestButton({ connection, ariaColor }) {
  const { lang } = useLang();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    if (testing || !connection?.access_token || !connection?.ig_account_id) return;
    
    setTesting(true);
    setResult(null);

    try {
      // 1. Test token validity
      const meRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,name,username&access_token=${connection.access_token}`
      );
      const meData = await meRes.json();
      
      if (meData.error) {
        setResult({ success: false, step: 1, error: meData.error.message });
        setTesting(false);
        return;
      }

      // 2. Test webhook subscription
      const subRes = await fetch(
        `https://graph.instagram.com/v21.0/${connection.ig_account_id}/subscribed_apps?access_token=${connection.access_token}`
      );
      const subData = await subRes.json();
      const isSubscribed = subData.data?.some(app => app.name?.includes('app') || app.id);

      setResult({
        success: true,
        token_valid: true,
        account_name: meData.username || meData.name,
        webhook_subscribed: isSubscribed,
      });
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