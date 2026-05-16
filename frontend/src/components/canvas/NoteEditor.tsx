import { Note, useVaultStore } from "@/lib/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Save, Trash2 } from "lucide-react";
import { useAnnotateNote } from '@/lib/api-client';
import { useGithub } from "@/hooks/use-github";
import { githubClient } from "@/lib/github";

interface NoteEditorProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteEditor({ note, open, onOpenChange }: NoteEditorProps) {
  const { updateNote, deleteNote, notes } = useVaultStore();
  const { saveNote: saveToGithub } = useGithub();
  const annotateNote = useAnnotateNote();
  
  const [editedNote, setEditedNote] = useState<Partial<Note>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setEditedNote(note);
    } else {
      setEditedNote({});
    }
  }, [note]);

  const handleSave = async () => {
    if (!note || !editedNote.title) return;
    setIsSaving(true);
    
    const finalNote = { ...note, ...editedNote } as Note;
    updateNote(note.path, finalNote);
    
    try {
      const content = githubClient.serializeMarkdown(finalNote);
      const newSha = await saveToGithub(note.path, content, note.sha);
      if (newSha) {
        updateNote(note.path, { sha: newSha });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    // Real implementation would also delete from github
    deleteNote(note.path);
    onOpenChange(false);
  };

  const handleAnnotate = async () => {
    if (!note) return;
    try {
      const result = await annotateNote.mutateAsync({
        data: {
          title: editedNote.title || note.title,
          content: editedNote.content || note.content,
          existingNotes: Object.values(notes).map(n => ({ path: n.path, title: n.title }))
        }
      });
      
      setEditedNote(prev => ({
        ...prev,
        aiAnnotation: result.annotation,
        type: result.type as any,
        tags: result.tags,
        connections: result.suggestedConnections
      }));
    } catch (e) {
      console.error(e);
    }
  };

  if (!note) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] w-[90vw] overflow-y-auto flex flex-col">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-serif">Edit Note</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-2">
            <Label>Title</Label>
            <Input 
              value={editedNote.title || ''} 
              onChange={e => setEditedNote({ ...editedNote, title: e.target.value })}
              className="font-serif text-lg"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Type</Label>
              <Select 
                value={editedNote.type || 'research'} 
                onValueChange={(val: any) => setEditedNote({ ...editedNote, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="synthesis">Synthesis</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={handleAnnotate}
                disabled={annotateNote.isPending}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Auto-Analyze
              </Button>
            </div>
          </div>

          {editedNote.aiAnnotation && (
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-md text-sm italic text-primary/80">
              "{editedNote.aiAnnotation}"
            </div>
          )}

          <div className="flex flex-col gap-2 flex-1 min-h-[300px]">
            <Label>Content</Label>
            <Textarea 
              value={editedNote.content || ''} 
              onChange={e => setEditedNote({ ...editedNote, content: e.target.value })}
              className="flex-1 font-mono text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-6 border-t border-border">
          <Button variant="destructive" onClick={handleDelete} size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
