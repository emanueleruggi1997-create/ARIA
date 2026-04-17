import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import ConversationList from '@/components/inbox/ConversationList';
import ChatView from '@/components/inbox/ChatView';
import ContactSidebar from '@/components/inbox/ContactSidebar';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Inbox() {
  const { business } = useBusiness();
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
    { id: 'tutti', label: 'Tutti' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'non_letti', label: '🔴 Non letti' },
    { id: 'archiviati', label: '📦 Archiviati' },
  ];

  const FilterPills = () => (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      {FILTER_PILLS.map(p => (
        <button
          key={p.id}
          onClick={() => setFilter(p.id)}
          className={cn(
            "shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap border",
            filter === p.id
              ? "bg-primary/20 text-primary border-primary/40"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-col h-screen">
        <div className="h-14 px-6 flex items-center border-b border-white/[0.06] shrink-0 gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Inbox</h1>
          {unreadTotal > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{unreadTotal} non letti</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #00E5A0' }} />
            <span className="text-[11px] text-green-400 font-semibold">ARIA online</span>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-white/[0.06] flex flex-col shrink-0">
            <div className="px-3 py-2.5 border-b border-white/[0.06]"><FilterPills /></div>
            <div className="flex-1 overflow-y-auto p-2">
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
          <ChatView
            conversation={activeConv}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] })}
              />
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
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile chat header */}
            <div className="h-14 px-3 flex items-center gap-3 border-b border-white/[0.06] bg-[#0C0F1A] shrink-0">
              <button
                onClick={() => setActiveConv(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{(activeConv.nome || '?')[0].toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeConv.nome}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{activeConv.canale}</p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatView
                conversation={activeConv}
                messages={activeMessages}
                onSendMessage={handleSendMessage}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] })}
                mobile
              />
            </div>
          </div>
        ) : (
          /* Conversation list */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile inbox header */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-[24px] font-black text-foreground tracking-tight">In<span className="text-primary">box</span></h1>
                  {unreadTotal > 0 && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{unreadTotal} non letti</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #00E5A0' }} />
                  <span className="text-[11px] text-green-400 font-semibold">ARIA</span>
                </div>
              </div>
              <FilterPills />
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