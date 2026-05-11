import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import InboxTabs from '@/components/inbox/InboxTabs';
import SubFilters from '@/components/inbox/SubFilters';
import ConvRow from '@/components/inbox/ConvRow';
import NewChatView from '@/components/inbox/NewChatView';
import ContactInfoPanel from '@/components/inbox/ContactInfoPanel';
import NewManualIGContactModal from '@/components/inbox/NewManualIGContactModal';
import { MessageSquare, RefreshCw, UserPlus } from 'lucide-react';
import { safeArray } from '@/lib/safeData.js';
import { useNavigate } from 'react-router-dom';

function cleanDisplayName(nome) {
  if (!nome) return 'Utente Instagram';
  if (nome.startsWith('User_')) return 'Utente Instagram';
  if (/^\d{8,}$/.test(nome)) return 'Utente Instagram';
  if (nome === 'Utente IG') return 'Utente Instagram';
  return nome;
}

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', wa: '#25D366', ig: '#DD2A7B',
  success: '#00E5A0', danger: '#FF3860',
};

function ConvSkeleton() {
  return (
    <div style={{ padding: '8px' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.card, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, background: C.card, borderRadius: 6, width: '60%' }} />
            <div style={{ height: 12, background: C.card, borderRadius: 6, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Inbox() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('whatsapp');
  const [waFilter, setWaFilter] = useState('tutti');
  const [igFilter, setIgFilter] = useState('tutti');
  const [activeConv, setActiveConv] = useState(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [readIds, setReadIds] = useState(new Set());
  const [actingId, setActingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const markReadTimerRef = useRef(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Hide app header on mobile when chat is open
  useEffect(() => {
    const header = document.querySelector('header');
    const spacer = document.querySelector('.h-14.md\\:hidden');
    if (isMobile && activeConv) {
      if (header) header.style.display = 'none';
      if (spacer) spacer.style.display = 'none';
    } else {
      if (header) header.style.display = '';
      if (spacer) spacer.style.display = '';
    }
    return () => {
      if (header) header.style.display = '';
      if (spacer) spacer.style.display = '';
    };
  }, [activeConv, isMobile]);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', business?.id],
    queryFn: () => base44.entities.Contact.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['all-messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 200),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const conversations = useMemo(() => {
    return safeArray(contacts).map(contact => {
      if (!contact?.id) return null;
      const msgs = safeArray(allMessages).filter(m => m?.contact_id === contact.id);
      const lastMsg = msgs[0];
      const unread = msgs.filter(m => !m?.letto && m?.ruolo === 'user' && !readIds.has(contact.id));
      return {
        contact_id: contact.id,
        nome: contact.canale === 'instagram' ? cleanDisplayName(contact.nome) : (contact.nome || '—'),
        canale: contact.canale,
        stato: contact.stato,
        numero: contact.numero,
        ai_disabled: contact.ai_disabled,
        archiviata: contact.archiviata || false,
        lastMessage: lastMsg?.testo || '',
        lastMessageTime: lastMsg?.created_date,
        unreadCount: unread.length,
        lastResponder: lastMsg?.ruolo,
      };
    }).filter(Boolean).sort((a, b) => {
      try { return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0); } catch { return 0; }
    });
  }, [contacts, allMessages, readIds]);

  const waConvs = conversations.filter(c => c.canale === 'whatsapp');
  const igConvs = conversations.filter(c => c.canale === 'instagram');
  const waUnread = waConvs.reduce((n, c) => n + c.unreadCount, 0);
  const igUnread = igConvs.reduce((n, c) => n + c.unreadCount, 0);

  const applyFilter = (convList, filter) => {
    switch (filter) {
      case 'non_letti': return convList.filter(c => c.unreadCount > 0 && !c.archiviata);
      case 'aria': return convList.filter(c => !c.ai_disabled && !c.archiviata);
      case 'archiviate': return convList.filter(c => c.archiviata);
      case 'broadcast': return [];
      case 'richieste': return convList.filter(c => !c.archiviata);
      default: return convList.filter(c => !c.archiviata);
    }
  };

  const activeFilter = activeTab === 'whatsapp' ? waFilter : igFilter;
  const setActiveFilter = activeTab === 'whatsapp' ? setWaFilter : setIgFilter;
  const currentConvs = activeTab === 'whatsapp' ? waConvs : igConvs;
  const filteredConvs = applyFilter(currentConvs, activeFilter);

  const activeMessages = useMemo(() => {
    if (!activeConv) return [];
    const real = safeArray(allMessages).filter(m => m?.contact_id === activeConv.contact_id).reverse();
    const opt = optimisticMessages.filter(m => m.contact_id === activeConv.contact_id);
    return [...real, ...opt];
  }, [activeConv, allMessages, optimisticMessages]);

  const activeContact = useMemo(() => {
    if (!activeConv) return null;
    return contacts.find(c => c.id === activeConv.contact_id) || null;
  }, [activeConv, contacts]);

  const handleSelect = useCallback(async (conv) => {
    setActiveConv(conv);
    setOptimisticMessages([]);
    setReadIds(prev => new Set([...prev, conv.contact_id]));
    setShowContactInfo(false);
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      const unread = allMessages.filter(m => m?.contact_id === conv.contact_id && !m?.letto && m?.ruolo === 'user');
      if (unread.length > 0) {
        await Promise.allSettled(unread.map(m => base44.entities.Message.update(m.id, { letto: true })));
        queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
      }
    }, 500);
  }, [allMessages, business?.id, queryClient]);

  const handleSendMessage = useCallback(async (text, ruolo) => {
    if (!text?.trim() || !activeConv?.contact_id || !business?.id) return;
    const optimistic = {
      id: `opt_${Date.now()}`,
      contact_id: activeConv.contact_id,
      business_id: business.id,
      canale: activeConv.canale || 'whatsapp',
      ruolo,
      testo: text.trim(),
      letto: true,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };
    setOptimisticMessages(prev => [...prev, optimistic]);
    base44.entities.Message.create({
      contact_id: activeConv.contact_id,
      business_id: business.id,
      canale: activeConv.canale || 'whatsapp',
      ruolo,
      testo: text.trim(),
      letto: true,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
      setOptimisticMessages([]);
    }).catch(() => {
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimistic.id));
    });
  }, [activeConv, business?.id, queryClient]);

  const handleArchive = async (conv) => {
    if (!conv?.contact_id || actingId === conv.contact_id) return;
    setActingId(conv.contact_id);
    try {
      await base44.entities.Contact.update(conv.contact_id, { archiviata: true });
      queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
      if (activeConv?.contact_id === conv.contact_id) setActiveConv(null);
    } finally { setActingId(null); }
  };

  const handleDelete = async (conv) => {
    if (!conv?.contact_id || actingId === conv.contact_id) return;
    setActingId(conv.contact_id);
    try {
      const msgs = allMessages.filter(m => m.contact_id === conv.contact_id);
      await Promise.allSettled(msgs.map(m => base44.entities.Message.delete(m.id)));
      await base44.entities.Contact.delete(conv.contact_id);
      queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
      if (activeConv?.contact_id === conv.contact_id) setActiveConv(null);
    } finally { setActingId(null); }
  };

  const handleMarkRead = (conv) => setReadIds(prev => new Set([...prev, conv.contact_id]));

  const handleToggleAI = (conv, newDisabled) => {
    queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
    if (activeConv?.contact_id === conv.contact_id) {
      setActiveConv(prev => prev ? { ...prev, ai_disabled: newDisabled } : prev);
    }
  };

  // Aggiorna conversazioni (semplice refresh dati)
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] }),
        queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] }),
      ]);
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  // ── MOBILE ──
  if (isMobile) {
    if (activeConv) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>
          <NewChatView
            conversation={activeConv}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onBack={() => setActiveConv(null)}
            mobile
            onOpenContactInfo={() => setShowContactInfo(true)}
          />
          {showContactInfo && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: C.surface, overflow: 'auto' }}>
              <ContactInfoPanel contact={activeContact} onClose={() => setShowContactInfo(false)} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 7rem)', background: C.bg }}>
        <div style={{ padding: '14px 16px 0', background: C.surface, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.text, letterSpacing: -0.5 }}>Inbox</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                <RefreshCw size={13} style={{ color: C.muted, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>
          <InboxTabs activeTab={activeTab} setActiveTab={tab => { setActiveTab(tab); setActiveConv(null); }} waUnread={waUnread} igUnread={igUnread} />
        </div>
        <SubFilters channel={activeTab} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? <ConvSkeleton /> : (
            filteredConvs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Nessuna conversazione</div>
                <div style={{ fontSize: 12 }}>Le conversazioni {activeTab === 'whatsapp' ? 'WhatsApp' : 'Instagram'} appaiono qui</div>
              </div>
            ) : filteredConvs.map(conv => (
              <ConvRow
                key={conv.contact_id}
                conv={conv}
                isActive={activeConv?.contact_id === conv.contact_id}
                onSelect={handleSelect}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
                onToggleAI={handleToggleAI}
              />
            ))
          )}
        </div>
        {showManualModal && (
          <NewManualIGContactModal
            businessId={business?.id}
            onClose={() => setShowManualModal(false)}
            onCreated={(conv) => {
              queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
              queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
              handleSelect(conv);
            }}
          />
        )}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <MessageSquare size={18} style={{ color: '#7000FF' }} />
        <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Inbox</span>
        <span style={{ fontSize: 11, color: C.muted, background: `${C.border}66`, borderRadius: 20, padding: '2px 10px' }}>
          {conversations.filter(c => !c.archiviata).length} conversazioni
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh semplice */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Aggiorna conversazioni"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: refreshing ? 0.6 : 1 }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? '...' : 'Aggiorna'}
          </button>

          {/* ARIA status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
            <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>ARIA online</span>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: conversation list */}
        <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <InboxTabs activeTab={activeTab} setActiveTab={tab => { setActiveTab(tab); setActiveConv(null); }} waUnread={waUnread} igUnread={igUnread} />
          {activeTab === 'instagram' && (
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
              <button
                onClick={() => setShowManualModal(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: '#DD2A7B15', border: '1px solid #DD2A7B40', color: '#DD2A7B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
              >
                <UserPlus size={13} /> Nuova conv. manuale
              </button>
            </div>
          )}
          <SubFilters channel={activeTab} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? <ConvSkeleton /> : (
              filteredConvs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: C.muted }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4 }}>Nessuna conversazione</div>
                  <div style={{ fontSize: 12 }}>Le conversazioni {activeTab === 'whatsapp' ? 'WhatsApp' : 'Instagram'} appaiono qui</div>
                </div>
              ) : filteredConvs.map(conv => (
                <ConvRow
                  key={conv.contact_id}
                  conv={conv}
                  isActive={activeConv?.contact_id === conv.contact_id}
                  onSelect={handleSelect}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onMarkRead={handleMarkRead}
                  onToggleAI={handleToggleAI}
                />
              ))
            )}
          </div>
        </div>

        {/* Center: chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <NewChatView
            conversation={activeConv}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onOpenContactInfo={() => setShowContactInfo(v => !v)}
          />
        </div>

        {/* Right: contact info panel */}
        {showContactInfo && activeConv && (
          <ContactInfoPanel
            contact={activeContact}
            onClose={() => setShowContactInfo(false)}
          />
        )}

        {/* Modal nuova conversazione manuale IG */}
        {showManualModal && (
          <NewManualIGContactModal
            businessId={business?.id}
            onClose={() => setShowManualModal(false)}
            onCreated={(conv) => {
              queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
              queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
              handleSelect(conv);
            }}
          />
        )}
      </div>
    </div>
  );
}