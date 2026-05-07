import React, { useState } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

export const TEMPLATES = [
  {
    id: 'newsletter',
    name: 'Newsletter Settimanale',
    desc: 'Aggiornamenti e novità per la tua lista',
    goal: 'Brand awareness & retention',
    emoji: '📰',
    color: '#00E5FF',
    defaultOggetto: 'Le novità di questa settimana 🗞️',
    defaultBody: `Ciao {{nome}},\n\nQuesta settimana vogliamo aggiornarti su quello che sta succedendo.\n\n[Scrivi qui il tuo contenuto]\n\nA presto,\n{{nome_azienda}}`,
  },
  {
    id: 'benvenuto',
    name: 'Benvenuto',
    desc: 'Email automatica al primo contatto',
    goal: 'Onboarding & first impression',
    emoji: '👋',
    color: '#7B2FFF',
    defaultOggetto: 'Benvenuto/a, {{nome}}! 👋',
    defaultBody: `Ciao {{nome}}, siamo felici di averti con noi!\n\nDa oggi fai parte della nostra community. Ecco cosa troverai:\n\n✅ [Beneficio 1]\n✅ [Beneficio 2]\n✅ [Beneficio 3]\n\nSe hai domande scrivici quando vuoi.\n\n{{nome_azienda}}`,
  },
  {
    id: 'offerta',
    name: 'Offerta Speciale',
    desc: 'Promozione esclusiva per i tuoi contatti',
    goal: 'Conversione immediata',
    emoji: '🔥',
    color: '#FF6B35',
    defaultOggetto: '{{nome}}, questa offerta è solo per te 🔥',
    defaultBody: `{{nome}}, questa è solo per te.\n\nAbbiamo preparato qualcosa di speciale riservato alla nostra lista.\n\n[Descrizione offerta]\n\n⏰ Valido fino al {{data_scadenza}}\n\n{{nome_azienda}}`,
  },
];

// ── Render completo email HTML come vera email ──
function EmailHTMLPreview({ templateId, style, compact = false }) {
  const scale = compact ? 0.32 : 0.55;
  const width = compact ? 320 : 520;

  const renderEmail = () => {
    if (templateId === 'newsletter') {
      return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D0D0D;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#00E5FF,#7B2FFF);padding:0 40px;height:80px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.25);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
              <span style="font-size:20px;">⬡</span>
            </div>
            <div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:-0.5px;">{{nome_azienda}}</div>
          </div>
          <!-- Body -->
          <div style="background:#1A1A2E;padding:40px;">
            <h2 style="font-size:24px;color:#00E5FF;font-weight:bold;margin:0 0 20px 0;">Le novità di questa settimana 🗞️</h2>
            <p style="font-family:Arial;font-size:16px;color:#E8E8E8;line-height:1.7;margin:0 0 16px 0;">Ciao <strong>Mario</strong>,</p>
            <p style="font-family:Arial;font-size:16px;color:#E8E8E8;line-height:1.7;margin:0 0 16px 0;">Questa settimana vogliamo aggiornarti su quello che sta succedendo.</p>
            <div style="background:rgba(0,229,255,0.08);border-left:3px solid #00E5FF;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
              <p style="font-family:Arial;font-size:15px;color:#E8E8E8;margin:0;font-style:italic;">[Scrivi qui il tuo contenuto]</p>
            </div>
            <p style="font-family:Arial;font-size:16px;color:#E8E8E8;line-height:1.7;margin:20px 0 0 0;">A presto,<br><strong style="color:#00E5FF;">{{nome_azienda}}</strong></p>
          </div>
          <!-- Footer -->
          <div style="background:#0D0D0D;padding:20px 40px;text-align:center;">
            <p style="font-family:Arial;font-size:12px;color:#666666;margin:0 0 6px 0;">{{nome_azienda}} · {{anno}}</p>
            <p style="font-family:Arial;font-size:12px;color:#666666;margin:0 0 6px 0;">Hai ricevuto questa email perché sei nella nostra lista.</p>
            <a href="#" style="font-family:Arial;font-size:12px;color:#00E5FF;text-decoration:underline;">Disiscriviti</a>
          </div>
        </div>
      `;
    }
    if (templateId === 'benvenuto') {
      return `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#ffffff;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#7B2FFF,#00E5FF);padding:40px;text-align:center;">
            <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
              <span style="font-size:22px;">⬡</span>
            </div>
            <h1 style="font-family:Georgia,serif;font-size:32px;color:#ffffff;font-weight:bold;margin:0;">Benvenuto! 👋</h1>
          </div>
          <!-- Body -->
          <div style="background:#F8F9FA;padding:40px;">
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#7B2FFF;font-weight:bold;margin:0 0 20px 0;">Ciao Mario, siamo felici di averti con noi!</h2>
            <p style="font-family:Georgia,serif;font-size:16px;color:#333333;line-height:1.7;margin:0 0 16px 0;">Da oggi fai parte della nostra community. Ecco cosa troverai:</p>
            <div style="margin:0 0 24px 0;">
              <p style="font-family:Georgia,serif;font-size:16px;color:#333333;margin:6px 0;">✅ [Beneficio 1]</p>
              <p style="font-family:Georgia,serif;font-size:16px;color:#333333;margin:6px 0;">✅ [Beneficio 2]</p>
              <p style="font-family:Georgia,serif;font-size:16px;color:#333333;margin:6px 0;">✅ [Beneficio 3]</p>
            </div>
            <p style="font-family:Georgia,serif;font-size:16px;color:#333333;line-height:1.7;margin:0 0 28px 0;">Se hai domande scrivici quando vuoi.</p>
            <div style="text-align:center;">
              <a href="#" style="display:inline-block;background:#7B2FFF;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;">Scopri di più →</a>
            </div>
          </div>
          <!-- Footer -->
          <div style="background:#F0F0F0;padding:16px 40px;text-align:center;">
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;margin:0 0 4px 0;">{{nome_azienda}} · {{anno}}</p>
            <a href="#" style="font-family:Arial,sans-serif;font-size:12px;color:#7B2FFF;text-decoration:underline;">Disiscriviti</a>
          </div>
        </div>
      `;
    }
    if (templateId === 'offerta') {
      return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1A0A2E;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#FF6B35,#FF2D55);padding:36px 40px;text-align:center;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;">
              <span style="font-size:20px;">⬡</span>
            </div>
            <h1 style="font-family:Arial,sans-serif;font-size:28px;color:#ffffff;font-weight:bold;margin:0;">🔥 OFFERTA ESCLUSIVA</h1>
          </div>
          <!-- Body -->
          <div style="background:#1A0A2E;padding:40px;">
            <h2 style="font-family:Arial,sans-serif;font-size:26px;color:#FF6B35;font-weight:bold;margin:0 0 20px 0;">Mario, questa è solo per te.</h2>
            <p style="font-family:Arial,sans-serif;font-size:16px;color:#E8E8E8;line-height:1.7;margin:0 0 16px 0;">Abbiamo preparato qualcosa di speciale riservato alla nostra lista.</p>
            <div style="background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.3);border-radius:10px;padding:20px;margin:20px 0;">
              <p style="font-family:Arial,sans-serif;font-size:16px;color:#E8E8E8;margin:0;">[Descrizione offerta]</p>
            </div>
            <p style="font-family:Arial,sans-serif;font-size:15px;color:#FF6B35;font-weight:bold;margin:0 0 28px 0;">⏰ Valido fino al {{data_scadenza}}</p>
            <div style="text-align:center;">
              <a href="#" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF2D55);color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:8px;text-decoration:none;box-shadow:0 0 20px rgba(255,107,53,0.4);">Approfitta ora →</a>
            </div>
          </div>
          <!-- Footer -->
          <div style="background:#0D0A1A;padding:16px 40px;text-align:center;">
            <p style="font-family:Arial,sans-serif;font-size:12px;color:#666666;margin:0 0 4px 0;">{{nome_azienda}} · {{anno}}</p>
            <a href="#" style="font-family:Arial,sans-serif;font-size:12px;color:#FF6B35;text-decoration:underline;">Disiscriviti</a>
          </div>
        </div>
      `;
    }
    // Blank
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#f5f5f5;padding:40px;text-align:center;border-bottom:2px dashed #dddddd;">
          <div style="width:48px;height:48px;background:#e0e0e0;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">⬡</span>
          </div>
          <p style="font-family:Arial,sans-serif;font-size:14px;color:#999999;margin:0;">[Logo azienda]</p>
        </div>
        <div style="padding:40px;">
          <p style="font-family:Arial,sans-serif;font-size:16px;color:#aaaaaa;text-align:center;margin:0;">[Il tuo contenuto qui]</p>
        </div>
        <div style="background:#f5f5f5;padding:16px 40px;text-align:center;">
          <p style="font-family:Arial,sans-serif;font-size:12px;color:#aaaaaa;margin:0;">{{nome_azienda}} · {{anno}} · <a href="#" style="color:#7B2FFF;">Disiscriviti</a></p>
        </div>
      </div>
    `;
  };

  return (
    <div style={{
      width: width,
      height: compact ? 100 : 320,
      overflow: 'hidden',
      borderRadius: compact ? 6 : 10,
      border: '1px solid #e0e0e0',
      background: '#fff',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        pointerEvents: 'none',
      }}>
        <div dangerouslySetInnerHTML={{ __html: renderEmail() }} />
      </div>
    </div>
  );
}

export default function StepTemplate({ selected, onSelect }) {
  const [activeId, setActiveId] = useState(selected || null);

  const handleSelect = (id) => {
    setActiveId(id);
    if (id === 'blank') {
      onSelect({
        id: 'blank', name: 'Da zero', goal: '', emoji: '✏️',
        defaultOggetto: '',
        defaultBody: '',
      }, { bgColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#7B2FFF', font: 'Arial', showLogo: false });
    } else {
      const tmpl = TEMPLATES.find(t => t.id === id);
      if (tmpl) onSelect(tmpl, {
        bgColor: tmpl.id === 'newsletter' ? '#0D0D0D' : tmpl.id === 'offerta' ? '#1A0A2E' : '#F8F9FA',
        textColor: tmpl.id === 'benvenuto' ? '#333333' : '#E8E8E8',
        accentColor: tmpl.color,
        font: tmpl.id === 'benvenuto' ? 'Georgia' : 'Arial',
        showLogo: true,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Scegli punto di partenza</div>
        <div style={{ fontSize: 13, color: C.muted }}>Seleziona un template pronto o parti da zero.</div>
      </div>

      {/* 3 template pronti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Template pronti</div>
        {TEMPLATES.map(tmpl => {
          const isSelected = activeId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              onClick={() => handleSelect(tmpl.id)}
              style={{
                background: C.card, borderRadius: 14,
                border: `2px solid ${isSelected ? tmpl.color : C.border}`,
                padding: 16, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 20px ${tmpl.color}33` : 'none',
                display: 'flex', gap: 16, alignItems: 'center',
              }}
            >
              <EmailHTMLPreview templateId={tmpl.id} compact />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{tmpl.emoji}</span>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{tmpl.name}</div>
                  {isSelected && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: tmpl.color, borderRadius: 20, padding: '2px 8px' }}>✓ SELEZIONATO</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{tmpl.desc}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: tmpl.color, background: tmpl.color + '15', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                  🎯 {tmpl.goal}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Da zero */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Oppure</div>
        <div
          onClick={() => handleSelect('blank')}
          style={{
            background: activeId === 'blank' ? `${C.accent2}18` : C.card,
            border: `2px dashed ${activeId === 'blank' ? C.accent2 : C.border}`,
            borderRadius: 14, padding: '24px 20px', cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: activeId === 'blank' ? `0 0 20px ${C.accent2}33` : 'none',
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: activeId === 'blank' ? `${C.accent2}22` : C.surface,
            border: `1px solid ${activeId === 'blank' ? C.accent2 : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>✏️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>Crea da zero</div>
            <div style={{ fontSize: 13, color: C.muted }}>Parti da una pagina bianca e crea la tua email personalizzata</div>
          </div>
          {activeId === 'blank' && (
            <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#fff', background: C.accent2, borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>✓ SELEZIONATO</div>
          )}
        </div>
      </div>
    </div>
  );
}