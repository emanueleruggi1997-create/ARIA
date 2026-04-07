import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { format } from 'date-fns';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-notifications', business?.id],
    queryFn: () => base44.entities.Message.filter(
      { business_id: business?.id, letto: false, ruolo: 'user' },
      '-created_date',
      10
    ),
    enabled: !!business?.id,
    refetchInterval: 30000,
  });

  const markAllRead = async () => {
    if (unreadMessages.length > 0) {
      await Promise.all(unreadMessages.map(m => base44.entities.Message.update(m.id, { letto: true })));
      queryClient.invalidateQueries({ queryKey: ['unread-notifications', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-messages', business?.id] });
    }
  };

  const toggleOpen = () => setOpen(v => !v);

  const handleClose = async () => {
    setOpen(false);
    await markAllRead();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:border-primary/30 transition-all"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unreadMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {unreadMessages.length > 9 ? '9+' : unreadMessages.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notifiche</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {unreadMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nessuna notifica</p>
                </div>
              ) : unreadMessages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => { setOpen(false); navigate('/inbox'); }}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors bg-primary/5"
                >
                  <p className="text-sm text-foreground">
                    {msg.canale === 'whatsapp' ? '📱' : '📸'} Nuovo messaggio {msg.canale === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{msg.testo}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}