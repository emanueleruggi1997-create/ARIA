import React from 'react';
import { cn } from '@/lib/utils';

export default function KpiCard({ title, value, icon: Icon, trend, trendLabel }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          {trend !== undefined && (
            <p className={cn(
              "text-xs font-medium mt-2",
              trend >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}