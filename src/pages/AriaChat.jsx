/**
 * AriaChat — pagina mobile dedicata per la chat con ARIA.
 * Aperta dal robot in Dashboard su mobile.
 * Nessun header, nessuna bottom nav — schermata pulita full screen.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import AriaChatCore from '@/components/aria/AriaChatCore';

export default function AriaChat() {
  const navigate = useNavigate();
  const { business } = useBusiness();

  const color = business?.aria_color || business?.robot_color || '#3B6EF8';
  const name = business?.aria_name || business?.robot_name || 'ARIA';
  const mood = business?.aria_mood || business?.robot_mood || 'felice';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100dvw',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0A0D14',
      zIndex: 9999,
    }}>
      <AriaChatCore
        color={color}
        name={name}
        mood={mood}
        business={business}
        form={null}
        unreadCount={0}
        activeLeads={0}
        scheduledPosts={0}
        lastLead={null}
        onClose={() => navigate(-1)}
        expanded={true}
        onToggleExpand={null}
        isMobile={true}
      />
    </div>
  );
}