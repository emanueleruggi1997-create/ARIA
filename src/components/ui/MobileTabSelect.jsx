import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MobileTabSelect({ tabs, value, onValueChange }) {
  return (
    <>
      {/* Mobile: native select */}
      <div className="block lg:hidden mb-5">
        <select
          value={value}
          onChange={e => onValueChange(e.target.value)}
          style={{
            width: '100%',
            background: '#0F1219',
            color: '#F0F4FF',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '15px',
            fontFamily: 'Inter, sans-serif',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {tabs.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop: normal tabs */}
      <div className="hidden lg:block">
        <TabsList className="bg-secondary w-full overflow-x-auto flex-nowrap scrollbar-none">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="shrink-0 text-xs px-3">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </>
  );
}