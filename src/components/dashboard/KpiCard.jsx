import React, { memo } from 'react';
import { cn } from '@/lib/utils';

const ACCENT_COLORS = {
  blue:   { border: '#3B6EF8', icon: 'bg-blue-500/10 text-blue-400',   bar: '#3B6EF8', glow: 'rgba(59,110,248,0.15)' },
  green:  { border: '#22c55e', icon: 'bg-green-500/10 text-green-400', bar: '#22c55e', glow: 'rgba(34,197,94,0.12)' },
  purple: { border: '#a855f7', icon: 'bg-purple-500/10 text-purple-400', bar: '#a855f7', glow: 'rgba(168,85,247,0.12)' },
  cyan:   { border: '#06b6d4', icon: 'bg-cyan-500/10 text-cyan-400',   bar: '#06b6d4', glow: 'rgba(6,182,212,0.12)' },
};

const KpiCard = memo(function KpiCard({ title, value, icon: Icon, trend, trendLabel, accent = 'blue' }) {
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.blue;

  return (
    <div
      className="relative bg-card rounded-[14px] p-4 md:p-5 overflow-hidden cursor-pointer group"
      style={{
        border: `1px solid rgba(255,255,255,0.07)`,
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 32px ${colors.glow}`;
        e.currentTarget.style.borderColor = `${colors.border}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]"
        style={{ background: colors.bar, opacity: 0.75 }}
      />

      <div className="flex items-start justify-between mt-1">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
          <p className="text-[26px] md:text-[28px] font-bold text-foreground leading-none">{value}</p>
          {trend !== undefined && (
            <p className={cn(
              "text-[12px] font-medium mt-2 flex items-center gap-0.5",
              trend >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>
            </p>
          )}
        </div>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", colors.icon)}>
          <Icon style={{ width: 18, height: 18 }} />
        </div>
      </div>
    </div>
  );
});

export default KpiCard;