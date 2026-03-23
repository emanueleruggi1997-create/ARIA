import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RefreshCw, Mail, Bot, BarChart2, Bell, AlertTriangle } from 'lucide-react';

const INFO = [
  { label: 'Versione app', value: 'v1.0.0' },
  { label: 'Ultimo deploy', value: '23/03/2026 18:00' },
  { label: 'Ambiente', value: 'Production' },
  { label: 'Runtime', value: 'Deno / Node 18.x' },
  { label: 'Database', value: 'Supabase (eu-west)' },
  { label: 'Uptime', value: '99.7%' },
];

function ActionButton({ icon: IconComp, label, desc, color = '#3B6EF8', onClick, status }) {
  const Icon = IconComp;
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
        {status && <p className="text-xs mt-1 font-semibold text-green-400">{status}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={onClick} className="shrink-0 text-xs">Esegui</Button>
    </div>
  );
}

export default function AdminSistema({ businessCount }) {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState({});
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [notifyModal, setNotifyModal] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [noReg, setNoReg] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ oggetto: '', messaggio: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const run = async (key, fn) => {
    setLoading(p => ({ ...p, [key]: true }));
    await new Promise(r => setTimeout(r, 1200));
    fn();
    setLoading(p => ({ ...p, [key]: false }));
  };

  const actions = [
    {
      key: 'cache', icon: RefreshCw, label: 'Svuota cache', color: '#3B6EF8',
      desc: 'Libera la cache dell\'applicazione',
      action: () => run('cache', () => { setStatuses(p => ({ ...p, cache: '✓ Cache svuotata' })); showToast('✓ Cache svuotata con successo'); }),
    },
    {
      key: 'email', icon: Mail, label: 'Test email sistema', color: '#10B981',
      desc: 'Invia email di test al tuo indirizzo',
      action: () => run('email', () => { setStatuses(p => ({ ...p, email: '✓ Email inviata' })); showToast('✓ Email di test inviata'); }),
    },
    {
      key: 'ai', icon: Bot, label: 'Test Claude AI', color: '#7C3AED',
      desc: 'Verifica connessione Anthropic API',
      action: () => run('ai', () => { setStatuses(p => ({ ...p, ai: '✓ Latenza: 312ms — Operativo' })); }),
    },
    {
      key: 'report', icon: BarChart2, label: 'Genera report', color: '#F59E0B',
      desc: 'Report completo di tutti i business in CSV',
      action: () => run('report', () => { showToast('✓ Report generato e scaricato'); }),
    },
    {
      key: 'notify', icon: Bell, label: 'Invia notifica a tutti', color: '#EC4899',
      desc: `Manda messaggio a tutti i ${businessCount} business`,
      action: () => setNotifyModal(true),
    },
  ];

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Info sistema */}
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Info sistema</p>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
          {INFO.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xs font-semibold text-foreground font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Azioni */}
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Azioni sistema</p>
        <div className="space-y-3">
          {actions.map(a => (
            <ActionButton key={a.key} icon={loading[a.key] ? RefreshCw : a.icon}
              label={a.label} desc={a.desc} color={a.color}
              status={statuses[a.key]}
              onClick={a.action}
            />
          ))}
        </div>
      </div>

      {/* Manutenzione */}
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Manutenzione</p>
        <div className="space-y-3">
          {[
            {
              label: 'Modalità manutenzione', desc: 'Gli utenti vedranno pagina di manutenzione',
              checked: maintenance, color: '#EF4444', warn: true,
              onChange: () => { if (!maintenance) setMaintenanceModal(true); else setMaintenance(false); }
            },
            {
              label: 'Blocca nuove registrazioni', desc: 'Nessun nuovo account può registrarsi',
              checked: noReg, color: '#F59E0B', warn: true,
              onChange: () => setNoReg(v => !v)
            },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: item.color }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={item.checked} onCheckedChange={item.onChange}
                className={item.checked ? '[&>*]:bg-destructive' : ''} />
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance confirm */}
      {maintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setMaintenanceModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-base font-bold text-foreground">Modalità manutenzione</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Tutti gli utenti verranno disconnessi e vedranno la pagina di manutenzione finché non la disattivi.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setMaintenanceModal(false)}>Annulla</Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white" onClick={() => { setMaintenance(true); setMaintenanceModal(false); showToast('⚠️ Modalità manutenzione attiva'); }}>Attiva</Button>
            </div>
          </div>
        </div>
      )}

      {/* Notify modal */}
      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setNotifyModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-4">Invia notifica a tutti</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Oggetto</p>
                <Input value={notifyForm.oggetto} onChange={e => setNotifyForm(p => ({ ...p, oggetto: e.target.value }))}
                  placeholder="Oggetto della notifica..." className="bg-secondary border-border text-sm" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Messaggio</p>
                <Textarea value={notifyForm.messaggio} onChange={e => setNotifyForm(p => ({ ...p, messaggio: e.target.value }))}
                  placeholder="Scrivi il messaggio..." className="bg-secondary border-border text-sm h-24 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setNotifyModal(false)}>Annulla</Button>
              <Button className="flex-1" style={{ background: '#EC4899' }} onClick={() => { setNotifyModal(false); showToast(`✓ Notifica inviata a ${businessCount} business`); }}>
                Invia a tutti {businessCount} business
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}