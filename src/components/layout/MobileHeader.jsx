import React from 'react';
import NotificationsBell from './NotificationsBell';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/LanguageContext.jsx';

const LOGO_URL = 'https://media.base44.com/images/public/69bfc400a0538988ee3a6cfd/93eb01793_emaralagentai.png';

export default function MobileHeader() {
  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const initial = (user?.full_name || 'U')[0].toUpperCase();

  return (
    <header className="h-14 bg-[#080A0F] border-b border-border flex items-center justify-between px-4 shrink-0 z-40">
      <div className="flex items-center gap-2">
        <img src={LOGO_URL} alt="Emaral" className="w-7 h-7 rounded-lg object-cover shrink-0" />
        <span className="text-sm font-bold text-foreground tracking-tight">Emaral Agent AI</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
          style={{
            background: 'transparent', border: '1px solid #1A2E4A', color: '#5A7A9A',
            fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 20,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {lang === 'it' ? '🇬🇧 EN' : '🇮🇹 IT'}
        </button>
        <NotificationsBell />
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initial}</span>
        </div>
      </div>
    </header>
  );
}