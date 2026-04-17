import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const LOG_TYPES = ['Tutti', 'ERROR', 'WARN', 'INFO', 'AI', 'AUTH', 'WEBHOOK'];
const TYPE_STYLE = {
  ERROR:   { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: '🔴' },
  WARN:    { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: '🟡' },
  INFO:    { bg: 'bg-green-500/15',  text: 'text-green-400',  dot: '🟢' },
  AI:      { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: '🔵' },
  AUTH:    { bg: 'bg-gray-500/15',   text: 'text-gray-400',   dot: '⚪' },
  WEBHOOK: { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: '🟣' },
};

export default function AdminLogs({ initialFilter }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoFilter, setTipoFilter] = useState(initialFilter || 'Tutti');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getAdminLogs', {});
      setLogs(res.data?.logs || []);
    } catch (e) {
      showToast('❌ Errore nel caricamento dei log');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and auto-refresh every 30s
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (initialFilter && initialFilter !== 'Tutti') setTipoFilter(initialFilter);
  }, [initialFilter]);

  const filtered = logs.filter(l => {
    if (tipoFilter !== 'Tutti' && l.tipo !== tipoFilter) return false;
    if (search && !l.messaggio?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nei log..."
            className="h-8 text-xs bg-card border-border pl-3" />
        </div>

        <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading} className="h-8 gap-1.5 text-xs">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Aggiorna
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? 'Caricamento...' : `${filtered.length} eventi${tipoFilter !== 'Tutti' ? ` (${tipoFilter})` : ''}`}
      </p>

      {/* Log list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {logs.length === 0 ? 'Nessun evento registrato' : 'Nessun evento trovato per i filtri selezionati'}
          </div>
        )}
        {loading && logs.length === 0 && (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        )}
        {filtered.map(log => {
          const st = TYPE_STYLE[log.tipo] || TYPE_STYLE.INFO;
          const isExp = expanded === log.id;
          const ts = log.timestamp ? new Date(log.timestamp) : null;
          return (
            <div key={log.id}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => setExpanded(isExp ? null : log.id)}>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${st.bg} ${st.text} border-current`}>
                  {st.dot} {log.tipo}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {ts ? format(ts, 'dd/MM HH:mm:ss') : '—'}
                </span>
                <span className="text-xs text-foreground flex-1 truncate">{log.messaggio}</span>
                {isExp ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>

              {isExp && (
                <div className="px-4 pb-4 space-y-3 bg-secondary/10 border-t border-border/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                    <Info label="Timestamp" value={ts ? format(ts, 'dd/MM/yyyy HH:mm:ss') : '—'} />
                    <Info label="Tipo" value={log.tipo} />
                    <Info label="Business ID" value={log.business_id} mono />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Messaggio</p>
                    <p className="text-xs text-foreground bg-secondary rounded-lg p-3">{log.messaggio}</p>
                  </div>
                  {log.extra && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dati extra</p>
                      <pre className="text-[10px] text-muted-foreground bg-secondary rounded-lg p-3 overflow-x-auto font-mono">{JSON.stringify(log.extra, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-xs text-foreground ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}