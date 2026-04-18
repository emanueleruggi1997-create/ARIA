import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import ConversationList from '@/components/inbox/ConversationList';
import ChatView from '@/components/inbox/ChatView';
import ContactSidebar from '@/components/inbox/ContactSidebar';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function Inbox() {
  const { business } = useBusiness();
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState(null);
  const [filter, setFilter] = useState('tutti');
  const [readIds, setReadIds] = useState(new Set());
  const [actingOnConv, setActingOnConv] = useState(null); // prevent double archive/delete

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts', business?.id],
    queryFn: () => base44.entities.Contact.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['all-messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 500),
    enabled: !!business?.id,
    staleTime: 10_000,
    refetchInterval: 15_000, // polling ogni 15s per messaggi in tempo reale
  });

  const conversations = useMemo(() => {
    return contacts.map(contact => {
      const msgs = allMessages.filter(m => m.contact_id === contact.id);
      const lastMsg = msgs[0];
      const unread = msgs.filter(m => !m.letto && m.ruolo === 'user' && !readIds.has(contact.id));
      return {
        contact_id: contact.id,
        nome: contact.nome,
        canale: contact.canale,
        stato: contact.stato,
        numero: contact.numero,
        lastMessage: lastMsg?.testo || '',
        lastMessageTime: lastMsg?.created_date,
        unreadCount: unread.length,
        lastResponder: lastMsg?.ruolo,
        archiviata: contact.archiviata || false,
      };
    }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
  }, [contacts, allMessages, readIds]);

  const activeMessages = useMemo(() => {
    if (!activeConv) return [];
    return allMessages.filter(m => m.contact_id === activeConv.contact_id).reverse();
  }, [activeConv, allMessages]);

  const activeContact = useMemo(() => {
    if (!activeConv) return null;
    return contacts.find(c => c.id === activeConv.contact_id) || null;
  }, [activeConv, contacts]);

  const handleSelect = (conv) => {
    setActiveConv(conv);
    setReadIds(prev => new Set([...prev, conv.contact_id]));
  };

  const handleMarkRead = (conv) => setReadIds(prev => new Set([...prev, conv.contact_id]));

  const handleArchive = async (conv) => {
    if (!conv?.contact_id || actingOnConv === conv.contact_id) return;
    setActingOnConv(conv.contact_id);
    try {
      await base44.entities.Contact.update(conv.contact_id, { archiviata: true });
      queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
      if (activeConv?.contact_id === conv.contact_id) setActiveConv(null);
    } catch (err) {
      console.error('[Inbox] handleArchive error:', err);
    } finally {
      setActingOnConv(null);
    }
  };

  const handleDelete = async (conv) => {
    if (!conv?.contact_id || actingOnConv === conv.contact_id) return;
    setActingOnConv(conv.contact_id);
    try {
      const msgs = allMessages.filter(m => m.contact_id === conv.contact_id);
      await Promise.allSettled(msgs.map(m => base44.entities.Message.delete(m.id)));
      await base44.entities.Contact.delete(conv.contact_id);
      queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
      if (activeConv?.contact_id === conv.contact_id) setActiveConv(null);
    } catch (err) {
      console.error('[Inbox] handleDelete error:', err);
    } finally {
      setActingOnConv(null);
    }
  };

  const handleSendMessage = async (text, ruolo) => {
    if (!text?.trim() || !activeConv?.contact_id || !business?.id) return;
    try {
      await base44.entities.Message.create({
        contact_id: activeConv.contact_id,
        business_id: business.id,
        canale: activeConv.canale || 'whatsapp',
        ruolo,
        testo: text.trim(),
        letto: true,
      });
      queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
    } catch (err) {
      console.error('[Inbox] handleSendMessage error:', err);
    }
  };

  const unreadTotal = conversations.filter(c => c.unreadCount > 0 && !c.archiviata).length;

  // Nascondi il MobileHeader globale quando la chat è aperta (evita doppio header)
  useEffect(() => {
    const mobileHeader = document.querySelector('header');
    const spacer = document.querySelector('.h-14.md\\:hidden');
    if (activeConv) {
      if (mobileHeader) mobileHeader.style.display = 'none';
      if (spacer) spacer.style.display = 'none';
    } else {
      if (mobileHeader) mobileHeader.style.display = '';
      if (spacer) spacer.style.display = '';
    }
    return () => {
      if (mobileHeader) mobileHeader.style.display = '';
      if (spacer) spacer.style.display = '';
    };
  }, [activeConv]);

  const ConvSkeleton = () => (
    <div className="space-y-1 p-2">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-11 h-11 rounded-full bg-secondary animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-secondary rounded animate-pulse w-3/4" />
            <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const FILTER_PILLS = [
    { id: 'tutti', label: lang === 'en' ? 'All' : 'Tutti', icon: null },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'non_letti', label: lang === 'en' ? 'Unread' : 'Non letti', icon: '🔴' },
    { id: 'archiviati', label: lang === 'en' ? 'Archived' : 'Archiviati', icon: '📦' },
  ];

  // Desktop filter pills (horizontal row)
  const FilterPills = () => (
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: '12px 16px' }}>
      {FILTER_PILLS.map(p => (
        <button
          key={p.id}
          onClick={() => setFilter(p.id)}
          style={{
            width: 'auto', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid',
            borderColor: filter === p.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
            background: filter === p.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            color: filter === p.id ? '#a5b4fc' : '#5A7A9A',
            transition: 'all 0.15s',
          }}
        >
          {p.icon && <span style={{ marginRight: 4 }}>{p.icon}</span>}{p.label}
        </button>
      ))}
    </div>
  );

  // Mobile filter pills (styled like screenshot)
  const MobileFilterPills = ({ filter, setFilter }) => (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, scrollbarWidth: 'none' }}>
      {FILTER_PILLS.map(p => {
        const isActive = filter === p.id;
        const accentColor = p.id === 'instagram' ? '#E1306C' : p.id === 'whatsapp' ? '#25D366' : p.id === 'non_letti' ? '#FF3860' : '#00C6FF';
        return (
          <button key={p.id} onClick={() => setFilter(p.id)} style={{
            flexShrink: 0, padding: '9px 18px', borderRadius: 50,
            background: isActive ? 'transparent' : '#111C30',
            border: isActive ? `2px solid ${accentColor}` : '1px solid #1A2E4A',
            color: isActive ? '#E8F4FF' : '#5A7A9A',
            fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: isActive ? `0 0 12px ${accentColor}44` : 'none',
            transition: 'all 0.2s',
          }}>
            {p.icon && <span style={{ fontSize: 14 }}>{p.icon}</span>}
            {p.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-col h-screen">
        <div className="h-16 px-6 flex items-center border-b border-white/[0.06] shrink-0 gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Inbox</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">{conversations.filter(c => !c.archiviata).length} {t.conversations}</span>
          {unreadTotal > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{unreadTotal} {t.unread}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #00E5A0' }} />
            <span className="text-[11px] text-green-400 font-semibold">{t.ariaOnline}</span>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}><FilterPills /></div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {loadingContacts ? <ConvSkeleton /> : (
                <ConversationList
                  conversations={conversations}
                  activeId={activeConv?.contact_id}
                  onSelect={handleSelect}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  filter={filter}
                />
              )}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <ChatView
            conversation={activeConv}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] })}
          />
          </div>
          <ContactSidebar
            contact={activeContact}
            businessId={business?.id}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['contacts', business?.id] })}
          />
        </div>
      </div>

      {/* ── MOBILE layout ── */}
      <div className="md:hidden flex flex-col h-[calc(100vh-7rem)]">
        {activeConv ? (
          <div className="flex flex-col flex-1 overflow-hidden" style={{ height: '100dvh' }}>
            <ChatView
              conversation={activeConv}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] })}
              onBack={() => setActiveConv(null)}
              mobile
            />
          </div>
        ) : (
          /* Conversation list */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile inbox header */}
            <div style={{ padding: '16px 20px 0', background: '#070B14', flexShrink: 0 }}>
              {/* Top bar: logo + ARIA status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7B2FFF, #00C6FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 16px #7B2FFF66' }}>⬡</div>
                  <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: 1, color: '#5A7A9A' }}>EMARAL</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0' }} />
                  <span style={{ fontSize: 12, color: '#00E5A0', fontWeight: 800 }}>{t.ariaOnline}</span>
                </div>
              </div>
              {/* Big title */}
              <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1.5, margin: '0 0 16px', color: '#E8F4FF' }}>
                In<span style={{ background: 'linear-gradient(90deg, #00C6FF, #7B2FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>box</span>
                {unreadTotal > 0 && <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,56,96,0.15)', color: '#FF3860', verticalAlign: 'middle', WebkitTextFillColor: '#FF3860' }}>{unreadTotal}</span>}
              </h1>
              {/* Filter chips */}
              <MobileFilterPills filter={filter} setFilter={setFilter} />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingContacts ? <ConvSkeleton /> : (
                <ConversationList
                  conversations={conversations}
                  activeId={null}
                  onSelect={handleSelect}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  filter={filter}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}