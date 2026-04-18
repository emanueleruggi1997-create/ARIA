import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLang } from '@/lib/LanguageContext.jsx';

function countFilledFields(form) {
  let count = 0;
  if (form.servizi?.trim()) count++;
  if (form.prezzi?.trim()) count++;
  if (form.cose_da_non_fare?.trim()) count++;
  if (form.faq?.trim()) count++;
  return count;
}

export default function AriaCosaSo({ form, updateField }) {
  const { t } = useLang();
  const filled = countFilledFields(form);
  const pct = Math.round((filled / 4) * 100);

  const QUALITY_LABELS = [t.qualityLow, t.qualityMed1, t.qualityMed2, t.qualityHigh];
  const qualityLabel = QUALITY_LABELS[filled] || QUALITY_LABELS[0];

  const qualityColor = filled === 0 ? '#EF4444' : filled === 1 ? '#F59E0B' : filled === 2 ? '#3B82F6' : '#10B981';

  return (
    <div className="space-y-5">
      {/* Quality bar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.businessKnowledge}</span>
          <span className="text-xs font-bold" style={{ color: qualityColor }}>{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: qualityColor }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-medium">{qualityLabel}</p>
      </div>

      <p className="text-sm text-muted-foreground px-1">{t.moreDetailsHint}</p>

      {/* Services */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛠️</span>
          <Label className="text-sm font-semibold text-foreground">{t.yourServices}</Label>
          {form.servizi?.trim() && <span className="ml-auto text-xs text-green-400">{t.compiled}</span>}
        </div>
        <Textarea
          value={form.servizi}
          onChange={e => updateField('servizi', e.target.value)}
          placeholder={t.servicesPlaceholder}
          className="bg-secondary border-border h-28 resize-none"
        />
      </div>

      {/* Prices */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <Label className="text-sm font-semibold text-foreground">{t.yourPrices}</Label>
          {form.prezzi?.trim() && <span className="ml-auto text-xs text-green-400">{t.compiled}</span>}
        </div>
        <Textarea
          value={form.prezzi}
          onChange={e => updateField('prezzi', e.target.value)}
          placeholder={t.pricesPlaceholder}
          className="bg-secondary border-border h-20 resize-none"
        />
      </div>

      {/* No-go */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚫</span>
          <Label className="text-sm font-semibold text-foreground">{t.neverSay}</Label>
          {form.cose_da_non_fare?.trim() && <span className="ml-auto text-xs text-green-400">{t.compiled}</span>}
        </div>
        <Textarea
          value={form.cose_da_non_fare}
          onChange={e => updateField('cose_da_non_fare', e.target.value)}
          placeholder={t.neverSayPlaceholder}
          className="bg-secondary border-border h-20 resize-none"
        />
      </div>

      {/* FAQ */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">❓</span>
          <Label className="text-sm font-semibold text-foreground">{t.frequentQuestions}</Label>
          {form.faq?.trim() && <span className="ml-auto text-xs text-green-400">{t.compiled}</span>}
        </div>
        <Textarea
          value={form.faq}
          onChange={e => updateField('faq', e.target.value)}
          placeholder={`Q: How much does a website cost?\nA: Our websites start from €500...\n\nQ: How long does it take?\nA: Usually 2-4 weeks...`}
          className="bg-secondary border-border h-32 resize-none font-mono text-xs"
        />
      </div>
    </div>
  );
}