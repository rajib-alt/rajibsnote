import { Note, useVaultStore } from "@/lib/store";
import { motion, useDragControls } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit2 } from "lucide-react";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  scale: number;
}

export function NoteCard({ note, onEdit, scale }: NoteCardProps) {
  const { updateNote } = useVaultStore();
  const dragControls = useDragControls();

  const typeColors: Record<string, string> = {
    research: "bg-chart-1/20 text-chart-1",
    idea: "bg-chart-4/20 text-chart-4",
    reference: "bg-chart-2/20 text-chart-2",
    synthesis: "bg-chart-5/20 text-chart-5",
    task: "bg-chart-3/20 text-chart-3",
    journal: "bg-primary/20 text-primary",
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        updateNote(note.path, {
          position: {
            x: note.position.x + info.offset.x / scale,
            y: note.position.y + info.offset.y / scale,
          },
        });
      }}
      initial={{ x: note.position.x, y: note.position.y }}
      animate={{ x: note.position.x, y: note.position.y }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onDoubleClick={() => onEdit(note)}
      className="absolute w-64 h-72 bg-card rounded-md border border-card-border shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing flex flex-col overflow-hidden group"
      style={{
        transformOrigin: "center center",
      }}
    >
      <div 
        className="h-8 border-b border-card-border bg-muted/30 flex items-center px-3 justify-between cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <Badge variant="outline" className={`text-[10px] uppercase font-mono tracking-wider border-none ${typeColors[note.type] || "bg-muted text-muted-foreground"}`}>
          {note.type}
        </Badge>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(note); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-serif font-bold text-lg leading-tight line-clamp-2 text-card-foreground">
          {note.title}
        </h3>
        
        <p className="text-sm text-muted-foreground font-sans line-clamp-4 flex-1">
          {note.content.substring(0, 150)}
          {note.content.length > 150 ? '...' : ''}
        </p>

        {note.aiAnnotation && (
          <div className="mt-2 bg-primary/5 p-2 rounded-sm border border-primary/10 flex gap-2 items-start">
            <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <p className="text-xs italic text-primary/80 line-clamp-2">
              {note.aiAnnotation}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
