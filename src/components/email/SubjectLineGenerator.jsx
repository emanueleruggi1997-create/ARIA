import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const C = {
  card: '#111C30', border: '#1A2E4A', text: '#E8F4FF', muted: '#5A7A9A',
  accent: '#00C6FF', accent2: '#7B2FFF', success: '#00E5A0',
};

export default function SubjectLineGenerator({ emailBody = '', onSelect, lang = 'en' }) {
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleGenerate = async () => {
    if (!emailBody.trim()) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 high-converting email subject lines in Italian for a B2B email. 
        Email content: ${emailBody.slice(0, 200)}...
        Return ONLY a JSON array of 5 subject line strings. No other text.
        Example format: ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"]`,
        model: 'gpt_5_mini',
      });
      
      const text = typeof result === 'string' ? result : result?.text || '[]';
      const parsed = JSON.parse(text);
      setSuggestions(Array.isArray(parsed) ? parsed : []);
      setExpanded(true);
    } catch (err) {
      console.error('[SubjectLineGenerator] Error:', err);
      setSuggestions([]);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 14, marginTop: 12,
    }}>
      <button onClick={() => !generating && handleGenerate()} disabled={generating || !emailBody.trim()} style={{
        width: '100%', background: `${C.accent2}22`, border: `1px solid ${C.accent2}44`,
        borderRadius: 8, padding: 12, color: C.accent2, fontWeight: 700, fontSize: 13,
        cursor: generating || !emailBody.trim() ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit', opacity: generating || !emailBody.trim() ? 0.5 : 1,
      }}>
        {generating ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {lang === 'en' ? 'Generating...' : 'Generazione...'}
          </>
        ) : (
          <>
            <Sparkles size={14} />
            {lang === 'en' ? '✨ Generate with ARIA' : '✨ Genera con ARIA'}
          </>
        )}
      </button>

      {expanded && suggestions.length > 0 && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>
            {lang === 'en' ? 'SUGGESTIONS' : 'SUGGERIMENTI'}
          </div>
          {suggestions.map((subject, i) => (
            <button key={i} onClick={() => onSelect(subject)} style={{
              background: `${C.accent}11`, border: `1px solid ${C.accent}33`,
              borderRadius: 8, padding: 10, textAlign: 'left', color: C.text,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
            }} onMouseEnter={e => e.target.style.background = `${C.accent}22`}
              onMouseLeave={e => e.target.style.background = `${C.accent}11`}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subject}
              </span>
              <button onClick={e => {
                e.stopPropagation();
                handleCopy(subject);
              }} style={{
                background: 'none', border: 'none', color: C.success,
                cursor: 'pointer', padding: 4, display: 'flex',
              }}>
                {copied === subject ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}