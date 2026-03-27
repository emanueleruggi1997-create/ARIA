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

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height: isMobile ? 'calc(100vh - 220px)' : 'calc(100vh - 260px)', minHeight: 300, maxHeight: isMobile ? 480 : 560 }}>
      <AriaChatCore
        color={ariaColor}
        name={ariaName}
        mood={mood}
        business={business}
        form={form}
        onClose={null}
        expanded={false}
        onToggleExpand={null}
        isMobile={isMobile}
      />
    </div>
  );
}