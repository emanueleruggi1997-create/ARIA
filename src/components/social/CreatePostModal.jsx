import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CreatePostModal({ open, onClose, businessId, businessNome, tono, onCreated }) {
  const [form, setForm] = useState({ canale: 'instagram', caption: '', hashtags: '', scheduled_at: '', media_url: '' });
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [aiCaptions, setAiCaptions] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleGenerateCaption = async () => {
    setGeneratingCaption(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Genera 3 varianti di caption per un post ${form.canale} del business "${businessNome}". Tono: ${tono || 'professionale'}.
Descrizione post: ${form.caption || 'post promozionale generico'}.

Restituisci un JSON con: captions (array di 3 stringhe), hashtags (stringa con hashtag suggeriti).`,
      response_json_schema: {
        type: 'object',
        properties: {
          captions: { type: 'array', items: { type: 'string' } },
          hashtags: { type: 'string' }
        }
      }
    });
    setAiCaptions(result.captions || []);
    if (result.hashtags) setForm(p => ({ ...p, hashtags: result.hashtags }));
    setGeneratingCaption(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, media_url: file_url }));
  };

  const handleSave = async (stato) => {
    setSaving(true);
    await base44.entities.Post.create({
      ...form,
      business_id: businessId,
      stato,
    });
    onCreated();
    onClose();
    setForm({ canale: 'instagram', caption: '', hashtags: '', scheduled_at: '', media_url: '' });
    setAiCaptions([]);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Canale</Label>
            <Select value={form.canale} onValueChange={v => setForm(p => ({ ...p, canale: v }))}>
              <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Media</Label>
            <div className="mt-1">
              {form.media_url ? (
                <div className="relative aspect-square max-w-[200px] rounded-lg overflow-hidden bg-secondary">
                  <img src={form.media_url} alt="" className="w-full h-full object-cover" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setForm(p => ({ ...p, media_url: '' }))}>✕</Button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Carica foto/video</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} />
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Caption</Label>
              <Button variant="ghost" size="sm" onClick={handleGenerateCaption} disabled={generatingCaption}>
                {generatingCaption ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                <span className="text-xs">Genera con AI</span>
              </Button>
            </div>
            <Textarea value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} placeholder="Scrivi la tua caption..." className="mt-1 bg-secondary border-border h-20" />
          </div>

          {aiCaptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary">✨ Varianti AI:</p>
              {aiCaptions.map((c, i) => (
                <button key={i} onClick={() => setForm(p => ({ ...p, caption: c }))} className="w-full text-left p-2.5 rounded-lg bg-secondary/80 hover:bg-secondary text-sm text-foreground transition-colors">
                  {c}
                </button>
              ))}
            </div>
          )}

          <div>
            <Label>Hashtags</Label>
            <Input value={form.hashtags} onChange={e => setForm(p => ({ ...p, hashtags: e.target.value }))} placeholder="#hashtag1 #hashtag2" className="mt-1 bg-secondary border-border" />
          </div>

          <div>
            <Label>Data/ora pubblicazione</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} className="mt-1 bg-secondary border-border" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave('bozza')} disabled={saving} className="flex-1">Salva bozza</Button>
            <Button onClick={() => handleSave(form.scheduled_at ? 'schedulato' : 'bozza')} disabled={saving} className="flex-1">
              {form.scheduled_at ? 'Schedula' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}