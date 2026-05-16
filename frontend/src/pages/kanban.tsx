import { Note, useVaultStore } from "@/lib/store";
import { NoteEditor } from "@/components/canvas/NoteEditor";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const COLUMNS = ["research", "idea", "reference", "synthesis", "task", "journal"] as const;

export default function KanbanPage() {
  const { notes, updateNote } = useVaultStore();
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const notesByType = COLUMNS.reduce((acc, col) => {
    acc[col] = Object.values(notes).filter(n => n.type === col);
    return acc;
  }, {} as Record<string, Note[]>);

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    const notePath = e.dataTransfer.getData("text/plain");
    if (notePath) {
      updateNote(notePath, { type: type as any });
    }
  };

  return (
    <div className="w-full h-full flex overflow-x-auto bg-background p-6 gap-6 items-start">
      {COLUMNS.map(column => (
        <div 
          key={column} 
          className="flex-shrink-0 w-80 bg-sidebar/50 rounded-xl border border-border flex flex-col max-h-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, column)}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-serif font-bold uppercase tracking-wider text-sm">{column}</h3>
            <Badge variant="secondary">{notesByType[column].length}</Badge>
          </div>
          
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-3">
            {notesByType[column].map(note => (
              <div 
                key={note.path}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", note.path)}
                onClick={() => setEditingNote(note)}
                className="bg-card p-4 rounded-lg border border-card-border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
              >
                <h4 className="font-serif font-bold mb-2 text-card-foreground">{note.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-3 font-sans">
                  {note.content.substring(0, 100)}
                </p>
                {note.aiAnnotation && (
                  <div className="mt-3 text-xs italic text-primary border-l-2 border-primary/30 pl-2">
                    {note.aiAnnotation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <NoteEditor 
        note={editingNote} 
        open={!!editingNote} 
        onOpenChange={(open) => !open && setEditingNote(null)} 
      />
    </div>
  );
}
