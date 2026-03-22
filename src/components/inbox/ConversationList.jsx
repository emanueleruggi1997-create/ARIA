import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ConversationList({ conversations, activeId, onSelect, filter }) {
  const filtered = conversations.filter(c => {
    if (filter === 'whatsapp') return c.canale === 'whatsapp';
    if (filter === 'instagram') return c.canale === 'instagram';
    if (filter === 'non_letti') return c.unreadCount > 0;
    return true;
  });

  return (
    <div className="space-y-0.5">
      {filtered.length > 0 ? filtered.map(conv => (
        <button
          key={conv.contact_id}
          onClick={() => onSelect(conv)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
            activeId === conv.contact_id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/80"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {(conv.nome || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground truncate">{conv.nome}</p>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {conv.lastMessageTime ? format(new Date(conv.lastMessageTime), 'HH:mm') : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                conv.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
              )}>
                {conv.canale === 'whatsapp' ? 'WA' : 'IG'}
              </span>
              <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
            </div>
          </div>
          {conv.unreadCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
            </div>
          )}
        </button>
      )) : (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessuna conversazione</p>
        </div>
      )}
    </div>
  );
}