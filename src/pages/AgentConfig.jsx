import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useLang } from '@/lib/LanguageContext.jsx';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import MobileTabSelect from '@/components/ui/MobileTabSelect';
import AriaHeader from '@/components/aria/AriaHeader';
import AriaChiSono from '@/components/aria/AriaChiSono';
import AriaCosaSo from '@/components/aria/AriaCosaSo';
import AriaComportamento from '@/components/aria/AriaComportamento';
import AriaParlami from '@/components/aria/AriaParlami';
import AriaAvanzato from '@/components/aria/AriaAvanzato';

export default function AgentConfig() {
  const { business, refreshBusiness } = useBusiness();
  const { lang, t } = useLang();
  const [activeTab, setActiveTab] = useState('chi-sono');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome_agente: 'ARIA', ruolo_agente: '', tono: 'professionale', lingua: 'Italiano',
    avatar_agente: '#3B6EF8', servizi: '', prezzi: '', cose_da_non_fare: '', faq: '',
    auto_risposta: true, auto_commenti: false, orario_inizio: '08:00', orario_fine: '20:00',
    giorni_attivi: ['lun','mar','mer','gio','ven'], fuori_orario_attivo: true,
    messaggio_fuori_orario: '', escalation_rules: [], email_notifica: '', ai_prompt: '',
    stato_agente: 'attivo',
    robot_mood: 'felice', aria_mood: 'felice',
  });

  useEffect(() => {
    if (business) {
      const color = business.aria_color || business.avatar_agente || business.robot_color || '#3B6EF8';
      const name = business.aria_name || business.nome_agente || business.robot_name || 'ARIA';
      const mood = business.aria_mood || business.robot_mood || 'felice';
      setForm({
        nome_agente: name,
        ruolo_agente: business.ruolo_agente || '',
        tono: business.tono || 'professionale',
        lingua: business.lingua || 'Italiano',
        avatar_agente: color,
        servizi: business.servizi || '',
        prezzi: business.prezzi || '',
        cose_da_non_fare: business.cose_da_non_fare || '',
        faq: business.faq || '',
        auto_risposta: business.auto_risposta !== false,
        auto_commenti: business.auto_commenti === true,
        orario_inizio: business.orario_inizio || '08:00',
        orario_fine: business.orario_fine || '20:00',
        giorni_attivi: business.giorni_attivi || ['lun','mar','mer','gio','ven'],
        fuori_orario_attivo: business.fuori_orario_attivo !== false,
        messaggio_fuori_orario: business.messaggio_fuori_orario || '',
        escalation_rules: business.escalation_rules || [],
        email_notifica: business.email_notifica || '',
        ai_prompt: business.ai_prompt || '',
        stato_agente: business.stato_agente || 'attivo',
        robot_mood: mood,
        aria_mood: mood,
      });
    }
  }, [business?.id]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Explicit save — writes canonical aria_* fields + legacy robot_* fields for dashboard sync
  const handleSave = async () => {
    if (!business?.id || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        aria_name: form.nome_agente,
        aria_color: form.avatar_agente,
        aria_mood: form.robot_mood,
        robot_name: form.nome_agente,
        robot_color: form.avatar_agente,
        robot_mood: form.robot_mood,
      };
      await base44.entities.Business.update(business.id, payload);
      await refreshBusiness();
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    } catch (err) {
      console.error('[AgentConfig] handleSave error:', err);
    } finally {
      setSaving(false);
    }
  };

  const ariaName = form.nome_agente || 'ARIA';
  const ariaColor = form.avatar_agente || '#3B6EF8';

  const tabs = lang === 'en' ? [
    { value: 'chi-sono', label: '👤 Who I am' },
    { value: 'cosa-so', label: '🧠 What I know' },
    { value: 'comportamento', label: '⚙️ How I behave' },
    { value: 'parlami', label: '💬 Talk to me' },
    { value: 'avanzato', label: '🔬 Advanced' },
  ] : [
    { value: 'chi-sono', label: '👤 Chi sono' },
    { value: 'cosa-so', label: '🧠 Cosa so' },
    { value: 'comportamento', label: '⚙️ Come mi comporto' },
    { value: 'parlami', label: '💬 Parlami' },
    { value: 'avanzato', label: '🔬 Avanzato' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl">
      <AriaHeader
        form={form}
        ariaName={ariaName}
        ariaColor={ariaColor}
        autoSaved={saved}
        business={business}
        onToggle={() => updateField('stato_agente', form.stato_agente === 'attivo' ? 'off' : 'attivo')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <MobileTabSelect value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

        <TabsContent value="chi-sono" className="mt-5">
          <AriaChiSono
            form={form}
            updateField={updateField}
            ariaName={ariaName}
            ariaColor={ariaColor}
            onSave={handleSave}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="cosa-so" className="mt-5">
          <AriaCosaSo form={form} updateField={updateField} />
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? t.saving : saved ? t.saved : (lang === 'en' ? 'Save' : 'Salva')}
            </button>
          </div>
        </TabsContent>

        <TabsContent value="comportamento" className="mt-5">
          <AriaComportamento form={form} updateField={updateField} ariaColor={ariaColor} />
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? t.saving : saved ? t.saved : (lang === 'en' ? 'Save' : 'Salva')}
            </button>
          </div>
        </TabsContent>

        <TabsContent value="parlami" className="mt-5">
          <AriaParlami form={form} ariaName={ariaName} ariaColor={ariaColor} business={business} />
        </TabsContent>

        <TabsContent value="avanzato" className="mt-5">
          <AriaAvanzato form={form} updateField={updateField} business={business} autoSaved={saved} />
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? t.saving : saved ? t.saved : (lang === 'en' ? 'Save' : 'Salva')}
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}