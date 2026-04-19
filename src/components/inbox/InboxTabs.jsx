import React from 'react';

const WaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm4.93 13.643c-.207.583-1.215 1.114-1.664 1.176-.45.063-.863.088-2.776-.579-2.34-.82-3.83-3.22-3.945-3.368-.113-.147-.927-1.232-.927-2.35s.586-1.666.794-1.895c.208-.229.454-.286.605-.286.152 0 .303.001.436.008.14.007.327-.053.512.39.19.454.644 1.572.7 1.686.057.114.095.247.019.397-.076.15-.114.243-.227.374-.113.132-.238.294-.34.395-.113.113-.23.235-.099.46.132.227.585.965 1.257 1.563.863.767 1.59 1.004 1.817 1.117.227.113.36.094.492-.057.133-.15.569-.664.72-.893.152-.228.303-.19.511-.114.208.076 1.32.623 1.547.737.227.113.378.17.434.265.057.094.057.54-.15 1.124z"/>
  </svg>
);

const IgIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="igGradTab" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F58529"/>
        <stop offset="30%" stopColor="#DD2A7B"/>
        <stop offset="70%" stopColor="#8134AF"/>
        <stop offset="100%" stopColor="#515BD4"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igGradTab)"/>
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
  </svg>
);

const C = {
  surface: '#0D1525', border: '#1A2E4A', muted: '#5A7A9A', text: '#E8F4FF',
  wa: '#25D366', bg: '#04080F',
};

export default function InboxTabs({ activeTab, setActiveTab, waUnread, igUnread }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '16px 16px 0',
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      flexShrink: 0,
    }}>
      {[
        { id: 'whatsapp', Icon: WaIcon, label: 'WhatsApp', unread: waUnread, activeColor: '#25D366', activeBg: '#25D36622' },
        { id: 'instagram', Icon: IgIcon, label: 'Instagram DM', unread: igUnread, activeColor: '#DD2A7B', activeBg: 'linear-gradient(135deg,#F5852922,#DD2A7B22,#8134AF22)' },
      ].map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: '14px 14px 0 0',
              border: isActive ? `1px solid ${tab.id === 'whatsapp' ? '#25D36644' : '#DD2A7B44'}` : `1px solid ${C.border}`,
              borderBottom: isActive ? `2px solid ${tab.id === 'whatsapp' ? C.wa : '#DD2A7B'}` : `1px solid ${C.border}`,
              background: isActive ? (tab.id === 'whatsapp' ? '#25D36618' : 'linear-gradient(135deg,#F5852912,#DD2A7B12,#8134AF12)') : C.bg,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              fontWeight: isActive ? 800 : 600, fontSize: 13,
              color: isActive ? (tab.id === 'whatsapp' ? C.wa : '#DD2A7B') : C.muted,
            }}
          >
            <tab.Icon />
            <span>{tab.label}</span>
            {tab.unread > 0 && (
              <span style={{
                background: tab.id === 'whatsapp' ? C.wa : '#DD2A7B',
                color: '#fff', borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, flexShrink: 0,
              }}>{tab.unread > 99 ? '99+' : tab.unread}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}