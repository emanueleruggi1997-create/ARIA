import React from 'react';
import BrandLogo from '@/components/layout/BrandLogo.jsx';
import NotificationsBell from './NotificationsBell';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LanguageContext.jsx';

const LOGO_URL = 'https://media.base44.com/images/public/69bfc400a0538988ee3a6cfd/56749d76c_logoemaralagentaitrasparente.png';

export default function MobileHeader() {
  const { user } = useAuth();
  const { lang, toggleLang } = useLang();
  const initial = (user?.full_name || 'U')[0].toUpperCase();

  return (
    <header className="h-14 bg-[#080A0F] border-b border-border flex items-center justify-between px-3 shrink-0 z-40 min-w-0">
      <div className="flex items-center gap-1 min-w-0 flex-shrink">
        <img src={LOGO_URL} alt="Emaral" className="shrink-0" style={{ width: 48, height: 32, objectFit: 'contain', mixBlendMode: 'screen' }} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLang}
          style={{
            background: 'transparent', border: '1px solid #1A2E4A', color: '#5A7A9A',
            fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 20,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {lang === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
        </button>
        <NotificationsBell />
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initial}</span>
        </div>
      </div>
    </header>
  );
}