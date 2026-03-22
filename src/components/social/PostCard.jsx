import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statoColors = {
  bozza: 'bg-muted text-muted-foreground',
  schedulato: 'bg-blue-500/10 text-blue-400',
  pubblicato: 'bg-green-500/10 text-green-400',
  errore: 'bg-red-500/10 text-red-400',
};

export default function PostCard({ post }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all">
      {post.media_url && (
        <div className="aspect-square bg-secondary">
          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={cn("text-[10px]", statoColors[post.stato])}>
            {post.stato}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {post.canale === 'instagram' ? 'IG' : 'FB'}
          </span>
        </div>
        <p className="text-sm text-foreground line-clamp-3">{post.caption || 'Nessuna caption'}</p>
        {post.hashtags && (
          <p className="text-xs text-primary mt-1 truncate">{post.hashtags}</p>
        )}
        {post.scheduled_at && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Schedulato: {format(new Date(post.scheduled_at), 'dd/MM/yyyy HH:mm')}
          </p>
        )}
        {post.stato === 'pubblicato' && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" /> {post.reach || 0}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="w-3 h-3" /> {post.likes || 0}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="w-3 h-3" /> {post.commenti || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}