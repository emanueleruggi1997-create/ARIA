import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import PostCard from '@/components/social/PostCard';
import CalendarGrid from '@/components/social/CalendarGrid';
import CreatePostModal from '@/components/social/CreatePostModal';

export default function SocialManager() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('calendario');

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', business?.id],
    queryFn: () => base44.entities.Post.filter({ business_id: business?.id }, '-created_date'),
    enabled: !!business?.id,
  });

  const bozze = posts.filter(p => p.stato === 'bozza');
  const schedulati = posts.filter(p => p.stato === 'schedulato');
  const pubblicati = posts.filter(p => p.stato === 'pubblicato');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bozze.length} bozze · {schedulati.length} schedulati · {pubblicati.length} pubblicati
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuovo Post
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="bozze">Bozze ({bozze.length})</TabsTrigger>
          <TabsTrigger value="schedulati">Schedulati ({schedulati.length})</TabsTrigger>
          <TabsTrigger value="pubblicati">Pubblicati ({pubblicati.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4">
          <CalendarGrid posts={posts} />
        </TabsContent>

        <TabsContent value="bozze" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bozze.map(p => <PostCard key={p.id} post={p} />)}
            {bozze.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nessuna bozza</p>}
          </div>
        </TabsContent>

        <TabsContent value="schedulati" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedulati.map(p => <PostCard key={p.id} post={p} />)}
            {schedulati.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nessun post schedulato</p>}
          </div>
        </TabsContent>

        <TabsContent value="pubblicati" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pubblicati.map(p => <PostCard key={p.id} post={p} />)}
            {pubblicati.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nessun post pubblicato</p>}
          </div>
        </TabsContent>
      </Tabs>

      <CreatePostModal 
        open={showCreate} 
        onClose={() => setShowCreate(false)} 
        businessId={business?.id} 
        businessNome={business?.nome}
        tono={business?.tono}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['posts'] })} 
      />
    </div>
  );
}