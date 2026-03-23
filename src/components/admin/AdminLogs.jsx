import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

function genLog(i = 0) {
  const types = ['ERROR','WARN','INFO','AI','AUTH','WEBHOOK'];
  const t = types[Math.floor(Math.random() * types.length)];
  const msgs = {
    ERROR:   ['Claude API timeout dopo 30s — Business: Emaral Group', 'Webhook delivery failed — retry 3/3', 'Database connection error: timeout after 10s'],
    WARN:    ['WhatsApp webhook ritardo 2.3s — Business: Studio Legale Roma', 'Rate limit 90% raggiunto — Business: Bar Roma', 'Token scaduto, rinnovo in corso'],
    INFO:    ['Nuovo business registrato: Mario Rossi Parrucchiere', 'Backup completato: 128MB', 'Sistema avviato correttamente'],
    AI:      ['Claude response: 1.2s | 340 token — Business: Emaral Group', 'Prompt ottimizzato: risparmio 120 token', 'Modello fallback attivato'],
    AUTH:    ['Login riuscito: admin@emaral.com', 'Sessione scaduta: user@example.com', 'Nuovo utente invitato: test@test.com'],
    WEBHOOK: ['Instagram DM ricevuto: @cliente123 → Bar Roma', 'WhatsApp msg in → +39 333 123456', 'Webhook registrato: business #12'],
  };
  return {
    id: `log-${Date.now()}-${i}-${Math.random()}`,
    tipo: t,
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
    messaggio: msgs[t][Math.floor(Math.random() * msgs[t].length)],
    business_id: 'biz-' + Math.floor(Math.random() * 100),
    request_id: 'req-' + Math.random().toString(36).slice(2, 10),
    stack: t === 'ERROR' ? 'Error: connection timeout\n  at Socket.connect (net.js:1142)\n  at createConnection (net.js:307)' : null,
    extra: { ip: '192.168.1.' + Math.floor(Math.random() * 255), env: 'production' },
  };
}

export default function AdminLogs({ initialFilter }) {
  const [logs, setLogs] = useState(() => Array.from({ length: 25 }, (_, i) => genLog(i)).sort((a, b) => b.timestamp - a.timestamp));
  const [tipoFilter, setTipoFilter] = useState(initialFilter || 'Tutti');
  const [periodo, setPeriodo] = useState('Oggi');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteSingle, setDeleteSingle] = useState(null);
  const [toast, setToast] = useState(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  // Add new log every 10s if live
  useEffect(() => {
    const t = setInterval(() => {
      if (!liveRef.current) return;
      const newLog = genLog(Date.now());
      setLogs(prev => [newLog, ...prev].slice(0, 200));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (initialFilter && initialFilter !== 'Tutti') setTipoFilter(initialFilter); }, [initialFilter]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleDeleteAll = () => {
    const count = filtered.length;
    setLogs(prev => prev.filter(l => !filtered.includes(l)));
    setDeleteAllConfirm(false);
    showToast(`✓ ${count} log eliminati`);
  };

  const handleDeleteOne = (log) => {
    setLogs(prev => prev.filter(l => l.id !== log.id));
    setDeleteSingle(null);
    showToast('✓ Log eliminato');
  };

  const filtered = logs.filter(l => {
    if (tipoFilter !== 'Tutti' && l.tipo !== tipoFilter) return false;
    if (search && !l.messaggio.toLowerCase().includes(search.toLowerCase()) && !l.request_id.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl" style={{ animation: 'fadeInUp .3s ease' }}>
          {toast}
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-24 h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Oggi', '7gg', '30gg'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nei log..."
            className="h-8 text-xs bg-card border-border pl-3" />
        </div>

        {/* Live toggle */}
        <button onClick={() => setLive(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${live ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-card border-border text-muted-foreground'}`}>
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          {live ? 'Live ON' : 'Live OFF'}
        </button>

        {!live && (
          <Button size="sm" variant="outline" onClick={() => setLogs(prev => [genLog(Date.now()), ...prev])} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Aggiorna
          </Button>
        )}

        <Button size="sm" onClick={() => setDeleteAllConfirm(true)}
          className="ml-auto h-8 bg-destructive hover:bg-destructive/90 text-white gap-1.5 text-xs">
          <Trash2 className="w-3 h-3" /> Elimina tutti
        </Button>
      </div>

      {/* Log count */}
      <p className="text-xs text-muted-foreground">{filtered.length} log{tipoFilter !== 'Tutti' ? ` (${tipoFilter})` : ''}</p>

      {/* Log list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Nessun log trovato</div>
        )}
        {filtered.map(log => {
          const st = TYPE_STYLE[log.tipo] || TYPE_STYLE.INFO;
          const isExpanded = expanded === log.id;
          return (
            <div key={log.id} style={{ animation: 'fadeInDown .3s ease' }}>
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : log.id)}>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${st.bg} ${st.text} border-current`}>{st.dot} {log.tipo}</span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{format(log.timestamp, 'dd/MM HH:mm:ss')}</span>
                <span className="text-xs text-foreground flex-1 truncate">{log.messaggio}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
                <div onClick={e => { e.stopPropagation(); setDeleteSingle(log); }}
                  className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 bg-secondary/10 border-t border-border/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                    <Info label="Timestamp" value={format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')} />
                    <Info label="Tipo" value={log.tipo} />
                    <Info label="Request ID" value={log.request_id} mono />
                    <Info label="Business ID" value={log.business_id} mono />
                    <Info label="Ambiente" value={log.extra?.env} />
                    <Info label="IP" value={log.extra?.ip} mono />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Messaggio completo</p>
                    <p className="text-xs text-foreground bg-secondary rounded-lg p-3">{log.messaggio}</p>
                  </div>
                  {log.stack && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Stack trace</p>
                      <pre className="text-[10px] text-red-400 bg-secondary rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">{log.stack}</pre>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dati extra</p>
                    <pre className="text-[10px] text-muted-foreground bg-secondary rounded-lg p-3 overflow-x-auto font-mono">{JSON.stringify(log.extra, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete all modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteAllConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-2">Elimina tutti i log</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Stai per eliminare <strong className="text-foreground">{filtered.length} log</strong>. Questa azione è irreversibile.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteAllConfirm(false)}>Annulla</Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white" onClick={handleDeleteAll}>Elimina tutto</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete single confirm */}
      {deleteSingle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteSingle(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 max-w-xs w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-foreground mb-4">Eliminare questo log?</p>
            <p className="text-xs text-muted-foreground mb-5 truncate">{deleteSingle.messaggio}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteSingle(null)}>No</Button>
              <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90 text-white" onClick={() => handleDeleteOne(deleteSingle)}>Sì</Button>
            </div>
          </div>
        </div>
      )}
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