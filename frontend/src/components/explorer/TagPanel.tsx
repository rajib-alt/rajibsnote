import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useVaultStore } from '@/lib/store';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TagPanel() {
  const { notes, activeTagFilter, setActiveTagFilter, setActiveNotePath } = useVaultStore();
  const [, setLocation] = useLocation();

  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of Object.values(notes)) {
      for (const tag of note.tags) {
        if (tag.trim()) counts[tag.trim()] = (counts[tag.trim()] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!activeTagFilter) return [];
    return Object.values(notes).filter((n) => n.tags.includes(activeTagFilter));
  }, [notes, activeTagFilter]);

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tags
        </span>
        {activeTagFilter && (
          <button
            onClick={() => setActiveTagFilter(null)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tagData.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <Tag className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p>No tags yet.</p>
            <p className="mt-1 opacity-70">Add tags to your notes to organize them.</p>
          </div>
        ) : (
          <>
            {/* Tag list */}
            <div className="py-1">
              {tagData.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-sidebar-accent/60 transition-colors',
                    activeTagFilter === tag && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tag}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{count}</span>
                </button>
              ))}
            </div>

            {/* Filtered notes */}
            {activeTagFilter && filteredNotes.length > 0 && (
              <div className="border-t border-sidebar-border mt-1 pt-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Notes tagged #{activeTagFilter}
                </div>
                {filteredNotes.map((note) => (
                  <button
                    key={note.path}
                    onClick={() => {
                      setActiveNotePath(note.path);
                      setLocation('/');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-sidebar-accent/60 transition-colors text-left"
                  >
                    <span className="text-muted-foreground">›</span>
                    <span className="truncate text-sidebar-foreground">{note.title}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
