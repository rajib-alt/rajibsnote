import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  category: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'Global',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['⌘', 'N'], label: 'New note' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['⌘', 'S'], label: 'Save current note' },
    ],
  },
  {
    category: 'Editor — Formatting',
    items: [
      { keys: ['⌘', 'B'], label: 'Bold' },
      { keys: ['⌘', 'I'], label: 'Italic' },
      { keys: ['⌘', '`'], label: 'Inline code' },
      { keys: ['⌘', '⇧', 'S'], label: 'Strikethrough' },
    ],
  },
  {
    category: 'Editor — Linking',
    items: [
      { keys: ['[', '['], label: 'Start a wikilink — autocomplete appears' },
      { keys: ['Tab'], label: 'Accept autocomplete suggestion' },
      { keys: ['Esc'], label: 'Dismiss autocomplete' },
    ],
  },
  {
    category: 'Editor — History',
    items: [
      { keys: ['⌘', 'Z'], label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
    ],
  },
  {
    category: 'Canvas',
    items: [
      { keys: ['Scroll'], label: 'Pan canvas' },
      { keys: ['⌘', 'Scroll'], label: 'Zoom in / out' },
      { keys: ['+'], label: 'Zoom in (controls)' },
      { keys: ['-'], label: 'Zoom out (controls)' },
    ],
  },
];

function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-medium text-muted-foreground shadow-sm">
      {k}
    </kbd>
  );
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
        // Don't open if the CodeMirror editor is focused
        if ((e.target as HTMLElement).closest('.cm-content')) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground/80">{item.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, i) => (
                        <Key key={i} k={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground/60 pt-2 border-t border-border/40 mt-2">
          Press <Key k="?" /> anywhere (outside the editor) to toggle this panel.
        </p>
      </DialogContent>
    </Dialog>
  );
}
