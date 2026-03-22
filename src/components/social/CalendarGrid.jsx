import React, { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CalendarGrid({ posts, onDayClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddedStart = startDay === 0 ? 6 : startDay - 1;

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground pb-2">{d}</div>
        ))}
        {Array(paddedStart).fill(null).map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
        {days.map(day => {
          const dayPosts = posts.filter(p => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day));
          return (
            <div key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={cn(
                "aspect-square rounded-lg p-1 text-center relative cursor-pointer transition-colors",
                isToday(day) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary',
              )}>
              <span className={cn("text-xs", isToday(day) ? 'font-bold text-primary' : 'text-muted-foreground')}>
                {format(day, 'd')}
              </span>
              {dayPosts.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map((p, i) => (
                    <div key={i} className={cn("w-1.5 h-1.5 rounded-full",
                      p.stato === 'pubblicato' ? 'bg-green-400' : p.stato === 'schedulato' ? 'bg-blue-400' : 'bg-muted-foreground'
                    )} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}