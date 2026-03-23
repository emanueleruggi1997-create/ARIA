import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import MobileTabSelect from '@/components/ui/MobileTabSelect';
import AriaHeader from '@/components/aria/AriaHeader';
import AriaChiSono from '@/components/aria/AriaChiSono';
import AriaCosaSo from '@/components/aria/AriaCosaSo';
import AriaComportamento from '@/components/aria/AriaComportamento';
import AriaParlami from '@/components/aria/AriaParlami';
import AriaAvanzato from '@/components/aria/AriaAvanzato';
import debounce from 'lodash/debounce';

export default function AgentConfig() {
  const { business, refreshBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState('chi-sono');
  const [autoSaved, setAutoSaved] = useState(false);
  const [form, setForm] = useState({
    nome_agente: 'ARIA', ruolo_agente: '', tono: 'professionale', lingua: 'Italiano',
    avatar_agente: '#3B6EF8', servizi: '', prezzi: '', cose_da_non_fare: '', faq: '',
    auto_risposta: true, orario_inizio: '08:00', orario_fine: '20:00',
    giorni_attivi: ['lun','mar','mer','gio','ven'], fuori_orario_attivo: true,
    messaggio_fuori_orario: '', escalation_rules: [], email_notifica: '', ai_prompt: '',
    stato_agente: 'attivo',
    robot_name: 'ARIA', robot_color: '#3B6EF8', robot_mood: 'felice',
  });

  useEffect(() => {
    if (business) {
      setForm({
        nome_agente: business.nome_agente || 'ARIA',
        ruolo_agente: business.ruolo_agente || '',
        tono: business.tono || 'professionale',
        lingua: business.lingua || 'Italiano',
        avatar_agente: business.avatar_agente || business.robot_color || '#3B6EF8',
        servizi: business.servizi || '',
        prezzi: business.prezzi || '',
        cose_da_non_fare: business.cose_da_non_fare || '',
        faq: business.faq || '',
        auto_risposta: business.auto_risposta !== false,
        orario_inizio: business.orario_inizio || '08:00',
        orario_fine: business.orario_fine || '20:00',
        giorni_attivi: business.giorni_attivi || ['lun','mar','mer','gio','ven'],
        fuori_orario_attivo: business.fuori_orario_attivo !== false,
        messaggio_fuori_orario: business.messaggio_fuori_orario || '',
        escalation_rules: business.escalation_rules || [],
        email_notifica: business.email_notifica || '',
        ai_prompt: business.ai_prompt || '',
        stato_agente: business.stato_agente || 'attivo',
        robot_name: business.robot_name || business.nome_agente || 'ARIA',
        robot_color: business.robot_color || business.avatar_agente || '#3B6EF8',
        robot_mood: business.robot_mood || 'felice',
      });
    }
  }, [business?.id]);

  const autoSave = useCallback(
    debounce(async (data) => {
      if (!business?.id) return;
      await base44.entities.Business.update(business.id, {
        ...data,
        // Keep robot in sync with ARIA name/color
        robot_name: data.nome_agente || data.robot_name,
        robot_color: data.avatar_agente || data.robot_color,
      });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200),
    [business]
  );

  const updateField = (field, value) => {
    const updated = { ...form, [field]: value };
    // Keep robot_name and robot_color in sync
    if (field === 'nome_agente') updated.robot_name = value;
    if (field === 'avatar_agente') updated.robot_color = value;
    setForm(updated);
    autoSave(updated);
  };

  const ariaName = form.nome_agente || 'ARIA';
  const ariaColor = form.avatar_agente || '#3B6EF8';

  const tabs = [
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
        autoSaved={autoSaved}
        business={business}
        onToggle={() => updateField('stato_agente', form.stato_agente === 'attivo' ? 'off' : 'attivo')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <MobileTabSelect value={activeTab} onValueChange={setActiveTab} tabs={tabs} />

        <TabsContent value="chi-sono" className="mt-5">
          <AriaChiSono form={form} updateField={updateField} ariaName={ariaName} ariaColor={ariaColor} />
        </TabsContent>

        <TabsContent value="cosa-so" className="mt-5">
          <AriaCosaSo form={form} updateField={updateField} />
        </TabsContent>

        <TabsContent value="comportamento" className="mt-5">
          <AriaComportamento form={form} updateField={updateField} ariaColor={ariaColor} />
        </TabsContent>

        <TabsContent value="parlami" className="mt-5">
          <AriaParlami form={form} ariaName={ariaName} ariaColor={ariaColor} business={business} />
        </TabsContent>

        <TabsContent value="avanzato" className="mt-5">
          <AriaAvanzato form={form} updateField={updateField} business={business} autoSaved={autoSaved} />
        </TabsContent>
      </Tabs>
    </div>
  );
}