/**
 * MetaTestButton — bottone di test standalone (usato fuori dalla card connessione).
 * Ora rimanda alla sezione diagnostica dentro MetaConnectionStatus.
 */
import React from 'react';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function MetaTestButton({ connection, ariaColor }) {
  const { lang } = useLang();

  // Il test reale ora è integrato dentro MetaConnectionStatus.
  // Questo componente resta per compatibilità ma punta alla diagnostica nella card.
  const scrollToCard = () => {
    const el = document.getElementById('meta-connection-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <button
      onClick={scrollToCard}
      disabled={!connection?.id}
      className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
      style={{
        background: `${ariaColor || '#3B6EF8'}15`,
        color: ariaColor || '#3B6EF8',
        border: `1px solid ${ariaColor || '#3B6EF8'}30`,
        cursor: connection?.id ? 'pointer' : 'not-allowed',
        opacity: connection?.id ? 1 : 0.5,
      }}
    >
      🔬 {lang === 'en' ? 'Go to Diagnostics' : 'Vai alla Diagnostica'}
    </button>
  );
}