import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import MobileTabSelect from '@/components/ui/MobileTabSelect';
import TabGenerale from '@/components/settings/TabGenerale';
import TabConnessioni from '@/components/settings/TabConnessioni';
import TabPiano from '@/components/settings/TabPiano';
import TabNotifiche from '@/components/settings/TabNotifiche';
import TabAspetto from '@/components/settings/TabAspetto';
import ConnectionsErrorBoundary from '@/components/settings/ConnectionsErrorBoundary';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const TABS = [
  { value: 'generale', label: '⚙️ Generale' },
  { value: 'connessioni', label: '🔗 Connessioni' },
  { value: 'piano', label: '💳 Piano' },
  { value: 'notifiche', label: '🔔 Notifiche' },
  { value: 'aspetto', label: '🎨 Aspetto' },
];

export default function Settings() {
  const { business, refreshBusiness } = useBusiness();
  const [metaNotice, setMetaNotice] = useState(null); // 'success' | 'error' | null

  const [activeTab, setActiveTab] = useState('generale');
  const [saving, setSaving] = useState(false);

  // Read ?tab=connections&meta=success/error from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab  = params.get('tab');
    const meta = params.get('meta');
    if (tab === 'connections') setActiveTab('connessioni');
    if (meta === 'success' || meta === 'error') {
      setMetaNotice(meta);
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setMetaNotice(null), 6000);
    }
  }, []);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome: '', settore: '', citta: '', telefono: '', sito_web: '', piva: '',
    piano: 'starter',
    wa_number: '', wa_api_key: '', wa_connesso: false,
    ig_username: '', ig_connesso: false,
    fb_username: '', fb_connesso: false,
    email_provider: 'gmail', email_smtp_host: '', email_smtp_porta: '',
    email_smtp_user: '', email_smtp_pass: '', email_connessa: false,
    email_notifica: '',
    notif_escalation: true, notif_report_settimanale: false, notif_limite_piano: true,
  });

  useEffect(() => {
    if (business) {
      setForm({
        nome: business.nome || '',
        settore: business.settore || '',
        citta: business.citta || '',
        telefono: business.telefono || '',
        sito_web: business.sito_web || '',
        piva: business.piva || '',
        piano: business.piano || 'starter',
        wa_number: business.wa_number || '',
        wa_api_key: business.wa_api_key || '',
        wa_connesso: !!business.wa_connesso,
        ig_username: business.ig_username || '',
        ig_connesso: !!business.ig_connesso,
        fb_username: business.fb_username || '',
        fb_connesso: !!business.fb_connesso,
        email_provider: business.email_provider || 'gmail',
        email_smtp_host: business.email_smtp_host || '',
        email_smtp_porta: business.email_smtp_porta || '',
        email_smtp_user: business.email_smtp_user || '',
        email_smtp_pass: business.email_smtp_pass || '',
        email_connessa: !!business.email_connessa,
        email_notifica: business.email_notifica || '',
        notif_escalation: business.notif_escalation !== false,
        notif_report_settimanale: !!business.notif_report_settimanale,
        notif_limite_piano: business.notif_limite_piano !== false,
      });
    }
  }, [business?.id]);

  // Listen for "go to piano tab" event from child
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    document.addEventListener('settings-goto-tab', handler);
    return () => document.removeEventListener('settings-goto-tab', handler);
  }, []);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async (extraFields = {}) => {
    if (!business?.id || saving) return;
    setSaving(true);
    try {
      const data = { ...form, ...extraFields };
      await base44.entities.Business.update(business.id, data);
      await refreshBusiness();
      showSaved();
    } catch (err) {
      console.error('[Settings] handleSave error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePartialSave = async (fields) => {
    if (!business?.id) return;
    try {
      await base44.entities.Business.update(business.id, fields);
      await refreshBusiness();
      showSaved();
    } catch (err) {
      console.error('[Settings] handlePartialSave error:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-2xl">
      {metaNotice === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
          ✓ Account Meta collegato con successo!
        </div>
      )}
      {metaNotice === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          ✗ Collegamento Meta non riuscito. Riprova.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
          {saved && <p className="text-xs text-green-400 mt-0.5">✓ Salvato</p>}
        </div>
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive text-sm" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 mr-2" /> Esci
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <MobileTabSelect value={activeTab} onValueChange={setActiveTab} tabs={TABS} />

        <TabsContent value="generale" className="mt-4">
          <TabGenerale form={form} setForm={setForm} saving={saving} onSave={() => handleSave()} />
        </TabsContent>

        <TabsContent value="connessioni" className="mt-4">
          <ConnectionsErrorBoundary>
            <TabConnessioni form={form} setForm={setForm} onSave={handlePartialSave} business={business} metaNotice={metaNotice} />
          </ConnectionsErrorBoundary>
        </TabsContent>

        <TabsContent value="piano" className="mt-4">
          <TabPiano form={form} setForm={setForm} onSave={handlePartialSave} />
        </TabsContent>

        <TabsContent value="notifiche" className="mt-4">
          <TabNotifiche form={form} setForm={setForm} saving={saving} onSave={() => handleSave()} />
        </TabsContent>

        <TabsContent value="aspetto" className="mt-4">
          <TabAspetto business={business} onSave={handlePartialSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}