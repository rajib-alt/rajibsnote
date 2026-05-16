import { useEffect, useState, useCallback } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useVaultStore } from "@/lib/store";
import { useLocation } from "wouter";
import { FileText, Grid, Share2, Settings, Sparkles, Plus, Calendar, MessageSquare, BarChart2, LayoutTemplate, MousePointer2 } from "lucide-react";
import { useAnnotateNotesBatch } from '@/lib/api-client';
import { Note } from "@/lib/store";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { notes, setActiveNotePath, setNotes } = useVaultStore();
  const [, setLocation] = useLocation();
  const annotateBatch = useAnnotateNotesBatch();

  const createNewNote = useCallback(() => {
    const newPath = `notes/untitled-${Date.now()}.md`;
    const newNote: Note = {
      path: newPath,
      title: 'Untitled',
      content: '',
      type: 'idea',
      tags: [],
      connections: [],
      position: { x: 400, y: 300 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes({ ...useVaultStore.getState().notes, [newPath]: newNote });
    setActiveNotePath(newPath);
    setLocation('/');
  }, [setNotes, setActiveNotePath, setLocation]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(false);
        createNewNote();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [createNewNote]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const openNote = (path: string) => {
    setActiveNotePath(path);
    setLocation('/');
  };

  const handleReanalyzeAll = async () => {
    const notesList = Object.values(notes).map(n => ({ path: n.path, title: n.title, content: n.content }));
    try {
      await annotateBatch.mutateAsync({ data: { notes: notesList } });
    } catch (e) {
      // silent
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search notes..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(createNewNote)}>
            <Plus className="mr-2 h-4 w-4 text-primary" />
            <span>New note</span>
            <span className="ml-auto text-xs text-muted-foreground opacity-60">⌘N</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Views">
          <CommandItem onSelect={() => runCommand(() => setLocation("/canvas"))}>
            <MousePointer2 className="mr-2 h-4 w-4" />
            <span>Canvas</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/graph"))}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Graph</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/kanban"))}>
            <Grid className="mr-2 h-4 w-4" />
            <span>Kanban</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/daily"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Daily Notes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/chat"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>AI Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/templates"))}>
            <LayoutTemplate className="mr-2 h-4 w-4" />
            <span>Templates</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/stats"))}>
            <BarChart2 className="mr-2 h-4 w-4" />
            <span>Vault Stats</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI Actions">
          <CommandItem onSelect={() => runCommand(handleReanalyzeAll)}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span>Re-analyze all notes with AI</span>
          </CommandItem>
        </CommandGroup>

        {Object.keys(notes).length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {Object.values(notes).map((note) => (
                <CommandItem key={note.path} onSelect={() => runCommand(() => openNote(note.path))}>
                  <FileText className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{note.title}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground/50 truncate shrink-0 max-w-24">
                    {note.path.replace(/\.md$/, '')}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
