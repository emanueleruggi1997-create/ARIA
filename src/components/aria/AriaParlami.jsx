import React, { useState, useEffect } from 'react';
import AriaChatCore from './AriaChatCore';

export default function AriaParlami({ form, ariaName, ariaColor, business }) {
  const mood = form?.robot_mood || form?.aria_mood || 'felice';
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Mobile: 100dvh - mobile header (56px) - bottom nav (64px) - page padding (32px) - tab selector (~60px) - aria header (~80px)
  // Desktop: 100vh - sidebar header - page padding - tabs - aria header
  return (
    <div
      className="rounded-2xl overflow-hidden border border-border"
      style={{
        height: isMobile ? 'calc(100dvh - 310px)' : 'calc(100vh - 280px)',
        minHeight: isMobile ? 320 : 420,
      }}
    >
      <AriaChatCore
        color={ariaColor}
        name={ariaName}
        mood={mood}
        business={business}
        form={form}
        onClose={null}
        expanded={true}
        onToggleExpand={null}
        isMobile={isMobile}
      />
    </div>
  );
}