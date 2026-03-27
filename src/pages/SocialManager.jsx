import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import MobileTabSelect from '@/components/ui/MobileTabSelect';
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
  const [actingOnId, setActingOnId] = useState(null); // prevent double actions

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', business?.id],
    queryFn: () => base44.entities.Post.filter({ business_id: business?.id }, '-created_date'),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['posts', business?.id] });

  const handleDelete = async (id) => {
    if (actingOnId === id) return;
    setActingOnId(id);
    try {
      await base44.entities.Post.delete(id);
      refresh();
    } catch (err) {
      console.error('[SocialManager] handleDelete error:', err);
    } finally {
      setActingOnId(null);
    }
  };

  const handleDuplicate = async (post) => {
    if (actingOnId === post.id) return;
    setActingOnId(post.id);
    try {
      await base44.entities.Post.create({
        business_id: post.business_id,
        canale: post.canale,
        caption: (post.caption || '') + ' (copia)',
        hashtags: post.hashtags,
        stato: 'bozza',
      });
      refresh();
    } catch (err) {
      console.error('[SocialManager] handleDuplicate error:', err);
    } finally {
      setActingOnId(null);
    }
  };

  const handleChangeStato = async (post, newStato) => {
    if (actingOnId === post.id) return;
    setActingOnId(post.id);
    try {
      await base44.entities.Post.update(post.id, { stato: newStato });
      refresh();
    } catch (err) {
      console.error('[SocialManager] handleChangeStato error:', err);
    } finally {
      setActingOnId(null);
    }
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
        <MobileTabSelect
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'calendario', label: '📅 Calendario' },
            { value: 'bozze', label: `📝 Bozze (${bozze.length})` },
            { value: 'schedulati', label: `⏰ Schedulati (${schedulati.length})` },
            { value: 'pubblicati', label: `✅ Pubblicati (${pubblicati.length})` },
          ]}
        />
        <TabsContent value="calendario" className="mt-4">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="text-5xl mb-4">📱</div>
              <p className="text-base font-medium text-foreground">Nessun post ancora</p>
              <p className="text-sm mt-1 mb-4">Crea il tuo primo contenuto social</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Crea primo post
              </Button>
            </div>
          ) : (
            <CalendarGrid posts={posts} onDayClick={handleDayClick} />
          )}
        </TabsContent>
        <TabsContent value="bozze" className="mt-4">{renderGrid(bozze, false)}</TabsContent>
        <TabsContent value="schedulati" className="mt-4">{renderGrid(schedulati, false)}</TabsContent>
        <TabsContent value="pubblicati" className="mt-4">{renderGrid(pubblicati, false)}</TabsContent>
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