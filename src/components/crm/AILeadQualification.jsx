import React, { useState } from 'react';
import { Sparkles, Loader2, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const C = {
  card: '#111C30', border: '#1A2E4A', text: '#E8F4FF', muted: '#5A7A9A',
  accent: '#00C6FF', accent2: '#7B2FFF', success: '#00E5A0', warning: '#FF9500',
};

export default function AILeadQualification({ lead, business, onUpdate, lang = 'en' }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    if (!lead || !business) return;
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Qualifica questo lead come CRM manager di "${business.nome}".

LEAD INFO:
- Nome: ${lead.contact_nome}
- Tipo progetto: ${lead.tipo_progetto || 'non specificato'}
- Budget: €${lead.budget_min || 0} - €${lead.budget_max || 'N/A'}
- Canale: ${lead.canale}
- Stato attuale: ${lead.stato}
- Note: ${lead.note_ai || 'nessuna'}

BUSINESS:
- Settore: ${business.settore}
- Servizi: ${business.servizi || 'non specificati'}
- Prezzi: ${business.prezzi || 'non specificati'}

Rispondi in JSON con: {
  "score": number 0-100,
  "status_recommendation": "nuovo" | "qualificato" | "preventivo_inviato",
  "fit": "high" | "medium" | "low",
  "reasons": ["reason1", "reason2", "reason3"],
  "next_action": "Azione consigliata",
  "estimated_deal_size": number
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            status_recommendation: { type: 'string' },
            fit: { type: 'string' },
            reasons: { type: 'array', items: { type: 'string' } },
            next_action: { type: 'string' },
            estimated_deal_size: { type: 'number' },
          },
        },
      });

      setAnalysis(result);
    } catch (err) {
      console.error('[AILeadQualification] Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!analysis || !lead || !onUpdate) return;
    await onUpdate(lead.id, { stato: analysis.status_recommendation, note_ai: JSON.stringify(analysis) });
  };

  if (!lead) return null;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Brain size={16} style={{ color: C.accent2 }} />
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>
          AI {lang === 'en' ? 'Lead Qualification' : 'Qualificazione Lead'}
        </h4>
      </div>

      {!analysis ? (
        <button onClick={handleAnalyze} disabled={analyzing} style={{
          width: '100%', background: `${C.accent2}22`, border: `1px solid ${C.accent2}44`,
          borderRadius: 8, padding: 12, color: C.accent2, fontWeight: 700, fontSize: 12,
          cursor: analyzing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: analyzing ? 0.7 : 1,
        }}>
          {analyzing ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {lang === 'en' ? 'Analyzing...' : 'Analisi...'}
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {lang === 'en' ? 'Qualify with AI' : 'Qualifica con AI'}
            </>
          )}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Score */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>
              QUALIFICATION SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 22, color: '#fff',
                boxShadow: `0 0 20px ${C.accent2}55`,
              }}>
                {analysis.score}
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  {lang === 'en' ? 'Fit level' : 'Livello fit'}: <span style={{
                    fontWeight: 800, color: analysis.fit === 'high' ? C.success : analysis.fit === 'medium' ? C.warning : C.muted,
                  }}>
                    {analysis.fit.toUpperCase()}
                  </span>
                </div>
                {analysis.estimated_deal_size && (
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 700 }}>
                    €{analysis.estimated_deal_size.toLocaleString('it-IT')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reasons */}
          {analysis.reasons && analysis.reasons.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>
                WHY
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {analysis.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          {analysis.next_action && (
            <div style={{
              background: `${C.success}11`, border: `1px solid ${C.success}33`,
              borderRadius: 8, padding: 10, fontSize: 12, color: C.text,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>💡 {lang === 'en' ? 'Next action' : 'Prossima azione'}:</div>
              {analysis.next_action}
            </div>
          )}

          {/* Apply button */}
          <button onClick={handleApply} style={{
            width: '100%', background: `linear-gradient(135deg, ${C.success}, #00a87a)`,
            border: 'none', borderRadius: 8, padding: 10, color: '#fff',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'en' ? 'Apply recommendation' : 'Applica raccomandazione'}
          </button>

          {/* Reset */}
          <button onClick={() => setAnalysis(null)} style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: 10, color: C.muted, fontWeight: 700,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'en' ? 'Analyze again' : 'Analizza di nuovo'}
          </button>
        </div>
      )}
    </div>
  );
}