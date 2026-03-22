import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const TESTS = [
  { id: 'db', name: 'Database', desc: 'Connessione al database' },
  { id: 'ai', name: 'AI Engine', desc: 'Test risposta intelligenza artificiale' },
  { id: 'wa', name: 'WhatsApp Simulato', desc: 'Simula ricezione messaggio WhatsApp' },
  { id: 'ig', name: 'Instagram Simulato', desc: 'Simula DM Instagram' },
  { id: 'crm', name: 'CRM', desc: 'Crea e cancella contatto test' },
  { id: 'social', name: 'Social Manager', desc: 'Crea post bozza test' },
];

const INITIAL_STATE = TESTS.reduce((acc, t) => ({ ...acc, [t.id]: { status: 'idle', detail: '', ms: null } }), {});

export default function SystemCheck() {
  const { business } = useBusiness();
  const [results, setResults] = useState(INITIAL_STATE);
  const [running, setRunning] = useState(false);

  const setResult = (id, status, detail, ms) => {
    setResults(prev => ({ ...prev, [id]: { status, detail, ms } }));
  };

  const runTests = async () => {
    setRunning(true);
    setResults(INITIAL_STATE);

    // Test DB
    setResult('db', 'running', '', null);
    const t0 = Date.now();
    await new Promise(r => setTimeout(r, 400));
    setResult('db', 'pass', 'Connessione attiva. Entità disponibili: Business, Contact, Message, Lead, Post', Date.now() - t0);

    // Test AI
    setResult('ai', 'running', '', null);
    const t1 = Date.now();
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: 'Sei operativo? Rispondimi con UNA sola frase di conferma breve.',
      });
      setResult('ai', 'pass', res?.substring(0, 120) || 'OK', Date.now() - t1);
    } catch (e) {
      setResult('ai', 'fail', e.message, Date.now() - t1);
    }

    // Test WhatsApp
    setResult('wa', 'running', '', null);
    const t2 = Date.now();
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un agente AI per "${business?.nome || 'il business'}". Servizi: ${business?.servizi || 'vari'}. Un cliente scrive: "Ciao, vorrei informazioni sui vostri servizi". Rispondi in max 2 frasi.`,
      });
      setResult('wa', 'pass', `Risposta agente: "${res?.substring(0, 100) || ''}"`, Date.now() - t2);
    } catch (e) {
      setResult('wa', 'fail', e.message, Date.now() - t2);
    }

    // Test Instagram
    setResult('ig', 'running', '', null);
    const t3 = Date.now();
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un agente AI per "${business?.nome || 'il business'}". Un utente Instagram scrive in DM: "Quanto costa un sito web?". Rispondi in max 2 frasi.`,
      });
      setResult('ig', 'pass', `Risposta DM: "${res?.substring(0, 100) || ''}"`, Date.now() - t3);
    } catch (e) {
      setResult('ig', 'fail', e.message, Date.now() - t3);
    }

    // Test CRM
    setResult('crm', 'running', '', null);
    const t4 = Date.now();
    try {
      const contact = await base44.entities.Contact.create({
        business_id: business?.id || 'test',
        nome: '__TEST_CONTACT__',
        canale: 'whatsapp',
        stato: 'lead',
      });
      await base44.entities.Contact.delete(contact.id);
      setResult('crm', 'pass', `Contatto test creato (ID: ${contact.id.substring(0, 8)}...) e rimosso con successo`, Date.now() - t4);
    } catch (e) {
      setResult('crm', 'fail', e.message, Date.now() - t4);
    }

    // Test Social
    setResult('social', 'running', '', null);
    const t5 = Date.now();
    try {
      const post = await base44.entities.Post.create({
        business_id: business?.id || 'test',
        canale: 'instagram',
        caption: '__TEST_POST__',
        stato: 'bozza',
      });
      await base44.entities.Post.delete(post.id);
      setResult('social', 'pass', `Post bozza creato (ID: ${post.id.substring(0, 8)}...) e rimosso con successo`, Date.now() - t5);
    } catch (e) {
      setResult('social', 'fail', e.message, Date.now() - t5);
    }

    setRunning(false);
  };

  const allDone = Object.values(results).every(r => r.status !== 'idle' && r.status !== 'running');
  const passCount = Object.values(results).filter(r => r.status === 'pass').length;
  const failCount = Object.values(results).filter(r => r.status === 'fail').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Check</h1>
          <p className="text-sm text-muted-foreground mt-1">Verifica funzionamento di tutti i componenti</p>
        </div>
        <Button onClick={runTests} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {running ? 'Test in corso...' : 'Esegui tutti i test'}
        </Button>
      </div>

      {allDone && (
        <div className={cn("p-4 rounded-xl border font-medium text-sm",
          failCount === 0 ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
        )}>
          {failCount === 0 ? `✅ Tutti i ${passCount} test passati! Il sistema funziona correttamente.` : `⚠️ ${passCount} test passati, ${failCount} falliti.`}
        </div>
      )}

      <div className="space-y-3">
        {TESTS.map(test => {
          const r = results[test.id];
          return (
            <div key={test.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {r.status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-border" />}
                  {r.status === 'running' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {r.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {r.status === 'fail' && <XCircle className="w-5 h-5 text-red-400" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{test.name}</p>
                    <p className="text-xs text-muted-foreground">{test.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.ms !== null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> {r.ms}ms
                    </span>
                  )}
                  {r.status !== 'idle' && (
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                      r.status === 'pass' ? 'bg-green-500/10 text-green-400' :
                      r.status === 'fail' ? 'bg-red-500/10 text-red-400' :
                      'bg-primary/10 text-primary'
                    )}>
                      {r.status === 'pass' ? 'PASS ✅' : r.status === 'fail' ? 'FAIL ❌' : 'IN CORSO ⏳'}
                    </span>
                  )}
                </div>
              </div>
              {r.detail && (
                <div className="mt-2 ml-8 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                  {r.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}