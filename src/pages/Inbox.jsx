import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import ConversationList from '@/components/inbox/ConversationList';
import ChatView from '@/components/inbox/ChatView';
import ContactSidebar from '@/components/inbox/ContactSidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export default function Inbox() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState(null);
  const [filter, setFilter] = useState('tutti');
  const [readIds, setReadIds] = useState(new Set());
  const [actingOnConv, setActingOnConv] = useState(null); // prevent double archive/delete

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', business?.id],
    queryFn: () => base44.entities.Contact.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['all-messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 200),
    enabled: !!business?.id,
    staleTime: 15_000,
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

  const FilterTabs = () => (
    <Tabs value={filter} onValueChange={setFilter}>
      <TabsList className="w-full bg-secondary">
        <TabsTrigger value="tutti" className="flex-1 text-xs">Tutti</TabsTrigger>
        <TabsTrigger value="instagram" className="flex-1 text-xs">📸 IG</TabsTrigger>
        <TabsTrigger value="whatsapp" className="flex-1 text-xs">💬 WA</TabsTrigger>
        <TabsTrigger value="non_letti" className="flex-1 text-xs">🔴</TabsTrigger>
        <TabsTrigger value="archiviati" className="flex-1 text-xs">📦</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-col h-screen">
        <div className="h-14 px-6 flex items-center border-b border-border shrink-0 gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Inbox</h1>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-border flex flex-col shrink-0">
            <div className="p-3 border-b border-border"><FilterTabs /></div>
            <div className="flex-1 overflow-y-auto p-2">
              <ConversationList
                conversations={conversations}
                activeId={activeConv?.contact_id}
                onSelect={handleSelect}
                onMarkRead={handleMarkRead}
                onArchive={handleArchive}
                onDelete={handleDelete}
                filter={filter}
              />
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
        {/* If a conversation is active, show full-screen chat */}
        {activeConv ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile chat header with back button */}
            <div className="h-12 px-3 flex items-center gap-3 border-b border-border bg-background shrink-0">
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
            <div className="p-3 border-b border-border shrink-0"><FilterTabs /></div>
            <div className="flex-1 overflow-y-auto p-2">
              <ConversationList
                conversations={conversations}
                activeId={null}
                onSelect={handleSelect}
                onMarkRead={handleMarkRead}
                onArchive={handleArchive}
                onDelete={handleDelete}
                filter={filter}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}