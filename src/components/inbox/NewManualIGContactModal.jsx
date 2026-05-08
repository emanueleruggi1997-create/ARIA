/**
 * NewManualIGContactModal — crea un contatto Instagram manuale con ARIA disattivata.
 * Usato quando l'operatore ha scritto per primo da Instagram e vuole prepararsi
 * a ricevere la risposta senza che ARIA risponda automaticamente.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', ig: '#DD2A7B', danger: '#FF3860',
  success: '#00E5A0', accent: '#7000FF',
};

export default function NewManualIGContactModal({ businessId, onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const raw = username.trim().replace(/^@/, '');
    if (!raw) { setError('Inserisci uno username Instagram'); return; }
    setLoading(true);
    setError('');
    try {
      // Cerca se esiste già un contatto con questo username/numero
      const existing = await base44.entities.Contact.filter({
        business_id: businessId,
        canale: 'instagram',
        nome: `@${raw}`,
      }).catch(() => []);

      let contact;
      if (existing.length > 0) {
        // Aggiorna quello esistente: assicura ai_disabled = true
        contact = await base44.entities.Contact.update(existing[0].id, {
          ai_disabled: true,
          stato: 'lead',
          note: note || existing[0].note,
        });
        contact = { ...existing[0], ai_disabled: true };
      } else {
        // Crea nuovo contatto
        contact = await base44.entities.Contact.create({
          business_id: businessId,
          nome: `@${raw}`,
          // numero lasciato vuoto: quando arriverà il webhook con il vero sender_id
          // il sistema lo troverà per username
          canale: 'instagram',
          stato: 'lead',
          ai_disabled: true,
          note: note || 'Conversazione iniziata manualmente dall\'operatore',
        });
      }

      // Crea un messaggio iniziale silenzioso per far apparire la conv in Inbox
      await base44.entities.Message.create({
        business_id: businessId,
        contact_id: contact.id,
        canale: 'instagram',
        ruolo: 'human',
        testo: `💬 Conversazione avviata manualmente — @${raw}. ARIA disattivata. In attesa di risposta.`,
        letto: true,
      });

      onCreated?.({
        contact_id: contact.id,
        nome: `@${raw}`,
        canale: 'instagram',
        ai_disabled: true,
        numero: contact.numero || '',
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Errore nella creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 420,
          background: C.surface, border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.ig}`,
          borderRadius: 16, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F58529,#DD2A7B,#833AB4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📸</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.text }}>Nuova conversazione manuale</div>
            <div style={{ fontSize: 11, color: C.muted }}>ARIA verrà disattivata automaticamente</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, padding: 4 }}>×</button>
        </div>

        {/* Info box */}
        <div style={{ padding: '10px 14px', background: `${C.ig}10`, border: `1px solid ${C.ig}30`, borderRadius: 10, marginBottom: 18, fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
          Usa questa funzione quando <strong style={{ color: C.text }}>hai già scritto tu per primo</strong> su Instagram e vuoi impedire che ARIA risponda automaticamente alla prima risposta del cliente.
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>USERNAME INSTAGRAM *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: C.card, border: `1px solid ${error && !username.trim() ? C.danger : C.border}`, borderRadius: 10, padding: '0 12px', gap: 6 }}>
              <span style={{ color: C.muted, fontSize: 14 }}>@</span>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="nomeutente"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: C.text, fontSize: 14, padding: '11px 0',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>NOTE (opzionale)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Es: Nuovo follower, interessato al servizio X"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 12px',
                color: C.text, fontSize: 13, fontFamily: 'inherit',
                resize: 'none', outline: 'none',
              }}
            />
          </div>

          {/* ARIA status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>🔴</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.danger }}>ARIA disattivata</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Quando il cliente risponde, la chat apparirà in Inbox senza risposta automatica</div>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: C.danger, background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '8px 12px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'none', border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !username.trim()}
              style={{
                flex: 2, padding: '11px', borderRadius: 10,
                background: loading || !username.trim() ? `${C.ig}30` : `linear-gradient(135deg,#F58529,${C.ig})`,
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 800, cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: loading || !username.trim() ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Creazione...' : '✅ Prepara contatto — ARIA off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}