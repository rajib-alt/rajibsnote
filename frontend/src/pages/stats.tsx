import { useMemo } from 'react';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { useVaultStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { BarChart2, FileText, Link2, Tag, Star, TrendingUp, Zap } from 'lucide-react';

function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.FC<{ className?: string }>; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground font-serif">{value}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function HeatMap({ data }: { data: Record<string, number> }) {
  const today = new Date();
  const cells = Array.from({ length: 91 }, (_, i) => {
    const d = subDays(today, 90 - i);
    const key = format(d, 'yyyy-MM-dd');
    return { date: key, count: data[key] ?? 0, dayOfWeek: d.getDay() };
  });

  const max = Math.max(...cells.map((c) => c.count), 1);

  // Group into weeks
  const weeks: typeof cells[] = [];
  let current: typeof cells = [];
  // Pad the start
  const firstDow = cells[0].dayOfWeek;
  for (let i = 0; i < firstDow; i++) current.push({ date: '', count: -1, dayOfWeek: i });
  for (const cell of cells) {
    current.push(cell);
    if (cell.dayOfWeek === 6) { weeks.push(current); current = []; }
  }
  if (current.length) { while (current.length < 7) current.push({ date: '', count: -1, dayOfWeek: current.length }); weeks.push(current); }

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((cell, ci) => {
            if (cell.count < 0) return <div key={ci} className="w-3 h-3" />;
            const intensity = cell.count === 0 ? 0 : Math.ceil((cell.count / max) * 4);
            return (
              <div
                key={ci}
                className={cn(
                  'w-3 h-3 rounded-sm transition-colors',
                  intensity === 0 && 'bg-muted',
                  intensity === 1 && 'bg-primary/25',
                  intensity === 2 && 'bg-primary/50',
                  intensity === 3 && 'bg-primary/75',
                  intensity === 4 && 'bg-primary',
                )}
                title={cell.date ? `${cell.date}: ${cell.count} edit${cell.count !== 1 ? 's' : ''}` : ''}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground w-20 truncate text-right shrink-0">{d.name}</div>
          <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded transition-all"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground w-6 text-right shrink-0">{d.value}</div>
        </div>
      ))}
      <div className="text-xs text-muted-foreground pt-1">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const { notes } = useVaultStore();
  const noteList = Object.values(notes);

  const stats = useMemo(() => {
    const totalNotes = noteList.length;
    const totalWords = noteList.reduce((s, n) => s + wordCount(n.content), 0);
    const totalConnections = noteList.reduce((s, n) => s + n.connections.length, 0);
    const starred = noteList.filter((n) => n.starred).length;

    // All tags
    const tagCounts: Record<string, number> = {};
    for (const n of noteList) {
      for (const t of n.tags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
    }
    const totalTags = Object.keys(tagCounts).length;
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Type distribution
    const typeCounts: Record<string, number> = {};
    for (const n of noteList) {
      typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
    }
    const typeDistribution = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Connection density
    const connectionDensity = totalNotes > 1
      ? ((totalConnections / 2) / (totalNotes * (totalNotes - 1) / 2) * 100).toFixed(1)
      : '0.0';

    // Most connected notes
    const mostConnected = noteList
      .filter((n) => n.connections.length > 0)
      .sort((a, b) => b.connections.length - a.connections.length)
      .slice(0, 5)
      .map((n) => ({ name: n.title, value: n.connections.length }));

    // Activity heatmap: count notes updated per day
    const heatmap: Record<string, number> = {};
    for (const n of noteList) {
      if (n.updatedAt) {
        try {
          const d = parseISO(n.updatedAt);
          if (isValid(d)) {
            const key = format(d, 'yyyy-MM-dd');
            heatmap[key] = (heatmap[key] ?? 0) + 1;
          }
        } catch {}
      }
    }

    // Writing streak
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = format(d, 'yyyy-MM-dd');
      if (heatmap[key] && heatmap[key] > 0) { streak++; d = subDays(d, 1); }
      else break;
    }

    // Avg words
    const avgWords = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

    return {
      totalNotes, totalWords, totalConnections, starred, totalTags,
      topTags, typeDistribution, connectionDensity, mostConnected, heatmap, streak, avgWords,
    };
  }, [noteList]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-8 py-5 border-b border-border">
        <BarChart2 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Vault Stats</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your knowledge at a glance</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Notes" value={stats.totalNotes} icon={FileText} sub={`~${stats.avgWords} words avg`} />
          <StatCard label="Total words" value={stats.totalWords.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Connections" value={stats.totalConnections} icon={Link2} sub={`${stats.connectionDensity}% density`} />
          <StatCard label="Unique tags" value={stats.totalTags} icon={Tag} sub={`${stats.starred} starred`} />
        </div>

        {stats.streak > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
            <Zap className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold text-amber-700 dark:text-amber-400">{stats.streak}-day writing streak!</span>
              <span className="text-sm text-amber-600/80 dark:text-amber-500/80 ml-2">Keep it up</span>
            </div>
          </div>
        )}

        {/* Activity heatmap */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Activity (last 13 weeks)</h2>
          <HeatMap data={stats.heatmap} />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-sm',
                  i === 0 && 'bg-muted',
                  i === 1 && 'bg-primary/25',
                  i === 2 && 'bg-primary/50',
                  i === 3 && 'bg-primary/75',
                  i === 4 && 'bg-primary',
                )}
              />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type distribution */}
          {stats.typeDistribution.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-foreground mb-4">Notes by type</h2>
              <BarChart data={stats.typeDistribution} label="note type" />
            </div>
          )}

          {/* Top tags */}
          {stats.topTags.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-foreground mb-4">Most used tags</h2>
              <BarChart data={stats.topTags} label="occurrences" />
            </div>
          )}

          {/* Most connected */}
          {stats.mostConnected.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-sm text-foreground mb-4">Most connected notes</h2>
              <BarChart data={stats.mostConnected} label="connections" />
            </div>
          )}
        </div>

        {noteList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No notes yet — start writing to see your stats.</p>
          </div>
        )}
      </div>
    </div>
  );
}
