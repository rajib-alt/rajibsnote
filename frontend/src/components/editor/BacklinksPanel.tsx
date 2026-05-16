import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useVaultStore, Note } from '@/lib/store';
import { Link2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BacklinksPanelProps {
  currentPath: string;
}

export function BacklinksPanel({ currentPath }: BacklinksPanelProps) {
  const { notes, setActiveNotePath } = useVaultStore();
  const [, setLocation] = useLocation();

  const backlinks = useMemo(() => {
    const title = notes[currentPath]?.title ?? '';
    const wikiTitle = `[[${title}]]`;
    const wikiPath = `[[${currentPath}]]`;
    const results: { note: Note; excerpt: string }[] = [];

    for (const note of Object.values(notes)) {
      if (note.path === currentPath) continue;
      const hasWikilink =
        note.content.includes(wikiTitle) || note.content.includes(wikiPath);
      const hasConnection = note.connections.includes(currentPath);

      if (hasWikilink || hasConnection) {
        // extract a short excerpt around the mention
        let excerpt = '';
        if (hasWikilink) {
          const idx = note.content.indexOf(wikiTitle) !== -1
            ? note.content.indexOf(wikiTitle)
            : note.content.indexOf(wikiPath);
          const start = Math.max(0, idx - 60);
          const end = Math.min(note.content.length, idx + 80);
          excerpt = (start > 0 ? '…' : '') + note.content.slice(start, end).trim() + (end < note.content.length ? '…' : '');
        } else {
          // just show the first non-empty line
          excerpt = note.content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? '';
        }
        results.push({ note, excerpt });
      }
    }
    return results;
  }, [notes, currentPath]);

  if (backlinks.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          <Link2 className="h-3.5 w-3.5" />
          Backlinks
        </div>
        <p className="text-xs text-muted-foreground">No notes link to this one yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        <Link2 className="h-3.5 w-3.5" />
        Backlinks
        <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-normal normal-case tracking-normal">
          {backlinks.length}
        </span>
      </div>
      <div className="space-y-2">
        {backlinks.map(({ note, excerpt }) => (
          <button
            key={note.path}
            onClick={() => {
              setActiveNotePath(note.path);
              setLocation('/');
            }}
            className="w-full text-left group rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-muted/40 px-3 py-2.5 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {note.title}
              </span>
            </div>
            {excerpt && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 font-mono">
                {excerpt}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
