/**
 * AdminHealthCheck — Pannello di health check e diagnostica sistema.
 * Mostra record rotti, token scaduti, connessioni invalide, ecc.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { formatSafeTimestamp } from '@/lib/safeDate.js';
import { safeArray } from '@/lib/safeData.js';

function IssueRow({ issue, idx }) {
  const [open, setOpen] = useState(false);
  const color = issue.level === 'critical' ? '#EF4444' : '#F59E0B';
  const bg = issue.level === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
  const icon = issue.level === 'critical' ? <XCircle className="w-3.5 h-3.5" style={{ color }} /> : <AlertTriangle className="w-3.5 h-3.5" style={{ color }} />;

  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 8, background: bg, marginBottom: 6 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1 }}>[{issue.area}]</span>
        <span style={{ fontSize: 12, color: '#9CA3AF', flex: 3 }}>{issue.msg}</span>
        {safeArray(issue.ids).length > 0 && (
          open ? <ChevronDown size={13} style={{ color: '#6B7280', flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
        )}
      </button>
      {open && safeArray(issue.ids).length > 0 && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {issue.ids.slice(0, 20).map(id => (
            <code key={id} style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, color: '#9CA3AF' }}>{id}</code>
          ))}
          {issue.ids.length > 20 && <span style={{ fontSize: 10, color: '#6B7280' }}>+{issue.ids.length - 20} altri...</span>}
        </div>
      )}
    </div>
  );
}

function CheckCard({ label, data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const hasError = !!data.error;

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        {hasError
          ? <XCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
          : <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
        }
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F0F4FF', flex: 1 }}>{label}</span>
        {open ? <ChevronDown size={13} style={{ color: '#6B7280' }} /> : <ChevronRight size={13} style={{ color: '#6B7280' }} />}
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px' }}>
          {hasError
            ? <div style={{ fontSize: 11, color: '#EF4444' }}>⚠️ {data.error}</div>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(data).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '3px 8px' }}>
                    <span style={{ color: '#6B7280' }}>{k}: </span>
                    <span style={{ color: '#F0F4FF', fontWeight: 700 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

export default function AdminHealthCheck() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('systemHealthCheck', {});
      setReport(res.data);
    } catch (e) {
      setError(e.message || 'Errore durante il check');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    OK: '#10B981',
    WARNING: '#F59E0B',
    CRITICAL: '#EF4444',
  }[report?.summary?.status] || '#9CA3AF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: '#3B6EF8' }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#F0F4FF' }}>System Health Check</span>
        </div>
        {report?.summary?.status && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            ● {report.summary.status}
          </span>
        )}
        <button
          onClick={runCheck}
          disabled={loading}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#3B6EF820', border: '1px solid #3B6EF840', color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Analisi in corso...' : 'Avvia Health Check'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          ⚠️ {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          Clicca "Avvia Health Check" per analizzare il sistema
        </div>
      )}

      {report && (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { label: 'Totale Issues', value: report.summary.total_issues, color: report.summary.total_issues > 0 ? '#F59E0B' : '#10B981' },
              { label: 'Critici', value: report.summary.critical, color: report.summary.critical > 0 ? '#EF4444' : '#10B981' },
              { label: 'Warning', value: report.summary.warnings, color: report.summary.warnings > 0 ? '#F59E0B' : '#10B981' },
            ].map(s => (
              <div key={s.label} style={{ background: `${s.color}12`, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Issues */}
          {safeArray(report.issues).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, letterSpacing: 1 }}>PROBLEMI RILEVATI</div>
              {report.issues.map((issue, idx) => <IssueRow key={idx} issue={issue} idx={idx} />)}
            </div>
          )}
          {safeArray(report.issues).length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#10B981', fontSize: 13 }}>
              ✅ Nessun problema rilevato — sistema sano
            </div>
          )}

          {/* Detailed checks */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8, letterSpacing: 1 }}>DETTAGLIO CHECK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(report.checks || {}).map(([key, data]) => (
                <CheckCard key={key} label={key.replace(/_/g, ' ').toUpperCase()} data={data} />
              ))}
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#4B5563', textAlign: 'right' }}>
            Eseguito: {formatSafeTimestamp(report.timestamp, 'dd/MM/yyyy HH:mm:ss', '—')}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}