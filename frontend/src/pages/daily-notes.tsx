import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVaultStore, DEFAULT_TEMPLATES } from '@/lib/store';
import { githubClient } from '@/lib/github';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

function notePath(dateStr: string) {
  return `daily/${dateStr}.md`;
}

function fillTemplate(content: string, title: string, date: string): string {
  return content
    .replace(/\{title\}/g, title)
    .replace(/\{date\}/g, date);
}

export default function DailyNotesPage() {
  const [, setLocation] = useLocation();
  const { notes, setNotes, setActiveNotePath, updateNote } = useVaultStore();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const displayDate = format(currentDate, 'EEEE, MMMM d, yyyy');
  const path = notePath(dateStr);
  const note = notes[path];

  const isToday = dateStr === todayKey();

  // Collect all existing daily notes
  const dailyEntries = Object.values(notes)
    .filter((n) => n.path.startsWith('daily/') && n.path.endsWith('.md'))
    .sort((a, b) => b.path.localeCompare(a.path));

  const streak = (() => {
    let count = 0;
    let d = new Date();
    while (true) {
      const k = `daily/${format(d, 'yyyy-MM-dd')}.md`;
      if (notes[k]) {
        count++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }
    return count;
  })();

  const createTodayNote = async () => {
    const dailyTemplate = DEFAULT_TEMPLATES.find((t) => t.id === 'daily-note');
    const content = dailyTemplate
      ? fillTemplate(dailyTemplate.content, displayDate, format(currentDate, 'MMMM d, yyyy'))
      : `# ${format(currentDate, 'MMMM d, yyyy')}\n\n## Today's focus\n\n- [ ] \n\n## Notes\n\n## Reflection\n\n`;

    const now = new Date().toISOString();
    const newNote = {
      path,
      title: format(currentDate, 'MMMM d, yyyy'),
      content,
      type: 'journal',
      tags: ['daily'],
      connections: [],
      position: { x: 0, y: 0 },
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (githubClient.isInitialized()) {
        const serialized = githubClient.serializeMarkdown(newNote);
        const sha = await githubClient.saveFile(path, serialized, undefined, `Daily note: ${dateStr}`);
        (newNote as any).sha = sha;
      }
      setNotes({ ...useVaultStore.getState().notes, [path]: newNote });
      setActiveNotePath(path);
      setLocation('/');
    } catch (e: any) {
      toast({ title: 'Failed to create note', description: e.message, variant: 'destructive' });
    }
  };

  const openNote = (p: string) => {
    setActiveNotePath(p);
    setLocation('/');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Daily Notes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Your daily journal and log</p>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-medium">{streak}-day streak</span>
            </div>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-center gap-4 py-4 border-b border-border">
          <button
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center min-w-48">
            <div className={cn('text-sm font-semibold font-serif', isToday ? 'text-primary' : 'text-foreground')}>
              {isToday ? 'Today' : format(currentDate, 'EEEE')}
            </div>
            <div className="text-xs text-muted-foreground">{format(currentDate, 'MMMM d, yyyy')}</div>
          </div>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
            disabled={isToday}
          >
            <ChevronRight className={cn('h-4 w-4', isToday && 'opacity-30')} />
          </button>
          {!isToday && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-xs text-primary hover:underline ml-2"
            >
              Back to today
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {note ? (
            <div
              className="max-w-2xl mx-auto cursor-pointer group"
              onClick={() => openNote(path)}
            >
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-mono">{path}</span>
                  <span className="text-xs text-muted-foreground">
                    {note.content.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <pre className="text-sm text-foreground/80 font-mono whitespace-pre-wrap line-clamp-12 leading-relaxed">
                  {note.content || '(empty)'}
                </pre>
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                  <span className="text-xs text-primary group-hover:underline">Open note →</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                {isToday ? "Start today's note" : `No note for ${format(currentDate, 'MMM d')}`}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {isToday
                  ? 'Capture your intentions, tasks, and reflections for today.'
                  : 'No daily note was written on this day.'}
              </p>
              {isToday && (
                <Button onClick={createTodayNote} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create today's note
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: recent entries */}
      <div className="w-56 border-l border-border flex flex-col bg-sidebar shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent entries
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {dailyEntries.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">No entries yet</div>
          ) : (
            dailyEntries.map((entry) => {
              const entryDate = entry.path.replace('daily/', '').replace('.md', '');
              const isActive = entryDate === dateStr;
              return (
                <button
                  key={entry.path}
                  onClick={() => {
                    setCurrentDate(parseISO(entryDate));
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-sidebar-accent/60 transition-colors',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  )}
                >
                  <div className="font-medium text-xs">{format(parseISO(entryDate), 'MMM d, yyyy')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {entry.content.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '...'}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
