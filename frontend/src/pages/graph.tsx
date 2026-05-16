import { useVaultStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useTheme } from "next-themes";
import { NoteEditor } from "@/components/canvas/NoteEditor";
import { Note } from "@/lib/store";

export default function GraphPage() {
  const { notes } = useVaultStore();
  const { theme } = useTheme();
  const graphRef = useRef<any>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!containerRef) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef]);

  const graphData = {
    nodes: Object.values(notes).map(n => ({
      id: n.path,
      name: n.title,
      type: n.type,
      val: 1 + (n.connections?.length || 0),
      note: n
    })),
    links: Object.values(notes).flatMap(n => 
      (n.connections || []).map(targetPath => {
        const target = notes[targetPath] || Object.values(notes).find(t => t.title === targetPath);
        return target ? { source: n.path, target: target.path } : null;
      }).filter(Boolean) as any[]
    )
  };

  const typeColors: Record<string, string> = {
    research: "#f87171", // chart-1
    idea: "#fbbf24", // chart-4
    reference: "#60a5fa", // chart-2
    synthesis: "#c084fc", // chart-5
    task: "#34d399", // chart-3
    journal: "#3b82f6", // primary
  };

  return (
    <div className="w-full h-full bg-background" ref={setContainerRef}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={node => typeColors[(node as any).type] || "#94a3b8"}
          nodeRelSize={6}
          linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
          backgroundColor={theme === 'dark' ? '#1c1a19' : '#f5f2eb'}
          onNodeClick={(node) => setSelectedNote((node as any).note)}
        />
      )}
      
      <NoteEditor 
        note={selectedNote} 
        open={!!selectedNote} 
        onOpenChange={(open) => !open && setSelectedNote(null)} 
      />
    </div>
  );
}
