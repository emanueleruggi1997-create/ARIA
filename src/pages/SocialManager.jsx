import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
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
  const [preselectedDate, setPreselectedDate] = useState(null);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', business?.id],
    queryFn: () => base44.entities.Post.filter({ business_id: business?.id }, '-created_date'),
    enabled: !!business?.id,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['posts'] });

  const handleDelete = async (id) => {
    await base44.entities.Post.delete(id);
    refresh();
  };

  const handleDuplicate = async (post) => {
    await base44.entities.Post.create({
      business_id: post.business_id,
      canale: post.canale,
      caption: post.caption + ' (copia)',
      hashtags: post.hashtags,
      stato: 'bozza',
    });
    refresh();
  };

  const handleChangeStato = async (post, newStato) => {
    await base44.entities.Post.update(post.id, { stato: newStato });
    refresh();
  };

  const handleDayClick = (day) => {
    setPreselectedDate(day);
    setShowCreate(true);
  };

  const bozze = posts.filter(p => p.stato === 'bozza');
  const schedulati = posts.filter(p => p.stato === 'schedulato');
  const pubblicati = posts.filter(p => p.stato === 'pubblicato');

  const renderGrid = (list, isMainEmpty) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {list.map(p => (
        <PostCard key={p.id} post={p} onDelete={handleDelete} onDuplicate={handleDuplicate} onChangeStato={handleChangeStato} />
      ))}
      {list.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">📱</div>
          <p className="text-base font-medium text-foreground">Nessun post ancora</p>
          <p className="text-sm mt-1 mb-4">Crea il tuo primo contenuto social</p>
          {isMainEmpty && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crea primo post
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bozze.length} bozze · {schedulati.length} schedulati · {pubblicati.length} pubblicati
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="hidden md:flex">
          <Plus className="w-4 h-4 mr-2" /> Nuovo Post
        </Button>
        <button onClick={() => setShowCreate(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="bozze">Bozze ({bozze.length})</TabsTrigger>
          <TabsTrigger value="schedulati">Schedulati ({schedulati.length})</TabsTrigger>
          <TabsTrigger value="pubblicati">Pubblicati ({pubblicati.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="calendario" className="mt-4">
          <CalendarGrid posts={posts} onDayClick={handleDayClick} />
        </TabsContent>
        <TabsContent value="bozze" className="mt-4">{renderGrid(bozze, 'Nessuna bozza')}</TabsContent>
        <TabsContent value="schedulati" className="mt-4">{renderGrid(schedulati, 'Nessun post schedulato')}</TabsContent>
        <TabsContent value="pubblicati" className="mt-4">{renderGrid(pubblicati, 'Nessun post pubblicato')}</TabsContent>
      </Tabs>

      <CreatePostModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setPreselectedDate(null); }}
        businessId={business?.id}
        businessNome={business?.nome}
        tono={business?.tono}
        onCreated={refresh}
      />
    </div>
  );
}