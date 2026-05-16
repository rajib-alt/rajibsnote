import { useEffect, useRef, useState } from "react";
import { useVaultStore } from "@/lib/store";
import { NoteCard } from "@/components/canvas/NoteCard";
import { NoteEditor } from "@/components/canvas/NoteEditor";
import { Button } from "@/components/ui/button";
import { Plus, MousePointer2, GitBranch, Sparkles } from "lucide-react";
import { Note } from "@/lib/store";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function CanvasPage() {
  const { notes, canvasState, setCanvasState, updateNote, setActiveNotePath, settings } = useVaultStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [, setLocation] = useLocation();

  const noteCount = Object.keys(notes).length;

  // Pan canvas
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== containerRef.current && (e.target as HTMLElement).id !== "canvas-surface") return;
    setIsDragging(true);
    setStartPan({ x: e.clientX - canvasState.panX, y: e.clientY - canvasState.panY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setCanvasState({
      panX: e.clientX - startPan.x,
      panY: e.clientY - startPan.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Zoom canvas
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = e.deltaY * -0.01;
        const newZoom = Math.min(Math.max(0.2, canvasState.zoom + zoomDelta), 3);
        setCanvasState({ zoom: newZoom });
      } else {
        setCanvasState({
          panX: canvasState.panX - e.deltaX,
          panY: canvasState.panY - e.deltaY
        });
      }
    };

    const container = containerRef.current;
    container?.addEventListener("wheel", handleWheel, { passive: false });
    return () => container?.removeEventListener("wheel", handleWheel);
  }, [canvasState.zoom, canvasState.panX, canvasState.panY, setCanvasState]);

  const handleCreateNote = () => {
    const newPath = `notes/untitled-${Date.now()}.md`;
    const newNote: Note = {
      path: newPath,
      title: "New Note",
      content: "",
      type: "idea",
      tags: [],
      connections: [],
      position: { 
        x: -canvasState.panX / canvasState.zoom + window.innerWidth / 2 - 128, 
        y: -canvasState.panY / canvasState.zoom + window.innerHeight / 2 - 144 
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useVaultStore.getState().setNotes({ ...notes, [newPath]: newNote });
    setEditingNote(newNote);
  };

  const hasGithub = !!(settings.githubPAT && settings.repoOwner && settings.repoName);

  return (
    <div className="w-full h-full relative overflow-hidden bg-background bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:40px_40px]">
      
      <div 
        ref={containerRef}
        id="canvas-surface"
        className={`w-full h-full absolute inset-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div 
          className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
          style={{
            transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`
          }}
        >
          {/* Draw connections first so they are behind cards */}
          <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
            {Object.values(notes).map(note => {
              return note.connections.map(targetPath => {
                const target = notes[targetPath] || Object.values(notes).find(n => n.title === targetPath);
                if (!target) return null;
                return (
                  <line 
                    key={`${note.path}-${targetPath}`}
                    x1={note.position.x + 128}
                    y1={note.position.y + 144}
                    x2={target.position.x + 128}
                    y2={target.position.y + 144}
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                );
              });
            })}
          </svg>

          {Object.values(notes).map((note) => (
            <NoteCard 
              key={note.path} 
              note={note} 
              onEdit={setEditingNote} 
              scale={canvasState.zoom} 
            />
          ))}
        </div>
      </div>

      {/* Empty state welcome */}
      {noteCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'pointer-events-auto bg-card border border-border rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4',
              'text-center'
            )}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-5">
              <MousePointer2 className="h-7 w-7 text-primary/70" />
            </div>
            <h2 className="font-serif text-xl font-semibold mb-1">Welcome to VaultCanvas</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Your notes live as cards on this infinite canvas, connected by AI.
            </p>

            <div className="space-y-3 text-left mb-7">
              <Step
                number={1}
                done={hasGithub}
                label={hasGithub ? 'GitHub connected' : 'Connect GitHub to sync notes'}
                action={!hasGithub ? () => setLocation('/settings') : undefined}
                actionLabel="Open Settings"
              />
              <Step
                number={2}
                done={false}
                label="Create your first note"
                action={handleCreateNote}
                actionLabel="Create note"
              />
              <Step
                number={3}
                done={false}
                label="Use AI to annotate and connect ideas"
                dimmed
              />
            </div>

            <p className="text-[11px] text-muted-foreground/50">
              Tip: press <kbd className="border border-border rounded px-1 py-0.5 text-[10px] font-mono">?</kbd> for all keyboard shortcuts
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <div className="bg-card border border-border rounded-md shadow-sm p-1 flex items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCanvasState({ zoom: Math.max(0.2, canvasState.zoom - 0.2) })}>-</Button>
          <span>{Math.round(canvasState.zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCanvasState({ zoom: Math.min(3, canvasState.zoom + 0.2) })}>+</Button>
        </div>
        
        <Button size="lg" className="rounded-full h-14 w-14 shadow-lg shadow-primary/20" onClick={handleCreateNote}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <NoteEditor 
        note={editingNote} 
        open={!!editingNote} 
        onOpenChange={(open) => !open && setEditingNote(null)} 
      />
    </div>
  );
}

interface StepProps {
  number: number;
  done: boolean;
  label: string;
  action?: () => void;
  actionLabel?: string;
  dimmed?: boolean;
}

function Step({ number, done, label, action, actionLabel, dimmed }: StepProps) {
  return (
    <div className={cn('flex items-center gap-3', dimmed && 'opacity-40')}>
      <div className={cn(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors',
        done
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground'
      )}>
        {done ? '✓' : number}
      </div>
      <span className="text-sm flex-1 text-foreground/80">{label}</span>
      {action && actionLabel && (
        <button
          onClick={action}
          className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
