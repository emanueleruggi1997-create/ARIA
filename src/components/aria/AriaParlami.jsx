import React from 'react';
import AriaChatCore from './AriaChatCore';

export default function AriaParlami({ form, ariaName, ariaColor, business }) {
  const mood = form?.robot_mood || form?.aria_mood || 'felice';

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 'calc(100vh - 260px)', minHeight: 320, maxHeight: 520 }}>
      <AriaChatCore
        color={ariaColor}
        name={ariaName}
        mood={mood}
        business={business}
        form={form}
        onClose={null}
        expanded={false}
        onToggleExpand={null}
        isMobile={false}
      />
    </div>
  );
}