import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Eye, MoreHorizontal, Pencil, Copy, RefreshCw, Trash2, Image } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statoColors = {
  bozza: 'bg-muted text-muted-foreground',
  schedulato: 'bg-blue-500/10 text-blue-400',
  pubblicato: 'bg-green-500/10 text-green-400',
  errore: 'bg-red-500/10 text-red-400',
};

export default function PostCard({ post, onDelete, onDuplicate, onChangeStato }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all group relative">
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-card/95 flex flex-col items-center justify-center p-4 gap-3">
          <p className="text-sm font-medium text-foreground text-center">Eliminare questo post?</p>
          <div className="flex gap-2">
            <button onClick={() => { onDelete?.(post.id); setConfirmDelete(false); }}
              className="px-3 py-1.5 bg-destructive text-white text-xs rounded-lg font-medium">Elimina</button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-secondary text-xs rounded-lg">Annulla</button>
          </div>
        </div>
      )}

      {/* Media or placeholder */}
      {post.media_url ? (
        <div className="aspect-square bg-secondary">
          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square bg-secondary/50 flex flex-col items-center justify-center gap-2">
          <Image className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">Nessuna immagine</p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={cn("text-[10px]", statoColors[post.stato])}>
            {post.stato}
          </Badge>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{post.canale === 'instagram' ? 'IG' : 'FB'}</span>

            {/* ··· menu */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  <button onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                    <Pencil className="w-3 h-3" /> Modifica post
                  </button>
                  <button onClick={() => { onDuplicate?.(post); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                    <Copy className="w-3 h-3" /> Duplica post
                  </button>
                  <button onClick={() => { onChangeStato?.(post, post.stato === 'bozza' ? 'schedulato' : 'bozza'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                    <RefreshCw className="w-3 h-3" /> Cambia stato
                  </button>
                  <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                    <Trash2 className="w-3 h-3" /> Elimina post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground line-clamp-3">{post.caption || 'Nessuna caption'}</p>
        {post.hashtags && <p className="text-xs text-primary mt-1 truncate">{post.hashtags}</p>}
        {post.scheduled_at && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Schedulato: {format(new Date(post.scheduled_at), 'dd/MM/yyyy HH:mm')}
          </p>
        )}
        {post.stato === 'pubblicato' && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" /> {post.reach || 0}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="w-3 h-3" /> {post.likes || 0}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="w-3 h-3" /> {post.commenti || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}