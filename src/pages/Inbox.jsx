import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import ConversationList from '@/components/inbox/ConversationList';
import ChatView from '@/components/inbox/ChatView';
import ContactSidebar from '@/components/inbox/ContactSidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';

export default function Inbox() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState(null);
  const [filter, setFilter] = useState('tutti');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', business?.id],
    queryFn: () => base44.entities.Contact.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['all-messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 200),
    enabled: !!business?.id,
  });

  const conversations = useMemo(() => {
    return contacts.map(contact => {
      const msgs = allMessages.filter(m => m.contact_id === contact.id);
      const lastMsg = msgs[0];
      const unread = msgs.filter(m => !m.letto && m.ruolo === 'user');
      const lastResponder = lastMsg?.ruolo;
      return {
        contact_id: contact.id,
        nome: contact.nome,
        canale: contact.canale,
        stato: contact.stato,
        numero: contact.numero,
        lastMessage: lastMsg?.testo || '',
        lastMessageTime: lastMsg?.created_date,
        unreadCount: unread.length,
        lastResponder,
      };
    }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
  }, [contacts, allMessages]);

  const activeMessages = useMemo(() => {
    if (!activeConv) return [];
    return allMessages.filter(m => m.contact_id === activeConv.contact_id).reverse();
  }, [activeConv, allMessages]);

  const activeContact = useMemo(() => {
    if (!activeConv) return null;
    return contacts.find(c => c.id === activeConv.contact_id) || null;
  }, [activeConv, contacts]);

  const handleSendMessage = async (text, ruolo) => {
    await base44.entities.Message.create({
      contact_id: activeConv.contact_id,
      business_id: business.id,
      canale: activeConv.canale,
      ruolo,
      testo: text,
      letto: true,
    });
    queryClient.invalidateQueries({ queryKey: ['all-messages'] });
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 px-6 flex items-center border-b border-border shrink-0 gap-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Inbox</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="w-full bg-secondary">
                <TabsTrigger value="tutti" className="flex-1 text-xs">Tutti</TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex-1 text-xs">WA</TabsTrigger>
                <TabsTrigger value="instagram" className="flex-1 text-xs">IG</TabsTrigger>
                <TabsTrigger value="non_letti" className="flex-1 text-xs">🔴</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ConversationList
              conversations={conversations}
              activeId={activeConv?.contact_id}
              onSelect={setActiveConv}
              filter={filter}
            />
          </div>
        </div>

        {/* Chat */}
        <ChatView
          conversation={activeConv}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['all-messages'] })}
        />

        {/* Contact sidebar */}
        <ContactSidebar
          contact={activeContact}
          businessId={business?.id}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
        />
      </div>
    </div>
  );
}