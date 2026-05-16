import { useState } from 'react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { useVaultStore, NoteTemplate, DEFAULT_TEMPLATES, Note } from '@/lib/store';
import { githubClient } from '@/lib/github';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  X,
  Check,
  LayoutTemplate,
} from 'lucide-react';

const TYPE_PALETTE: Record<string, string> = {
  research: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  idea: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  reference: 'bg-chart-2/15 text-chart-2 border-chart-2/30',
  synthesis: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  task: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  journal: 'bg-primary/10 text-primary border-primary/20',
};
function typeColor(type: string) {
  return TYPE_PALETTE[type] ?? 'bg-muted/60 text-muted-foreground border-border';
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fillTemplate(content: string, title: string): string {
  const date = format(new Date(), 'MMMM d, yyyy');
  return content
    .replace(/\{title\}/g, title)
    .replace(/\{date\}/g, date);
}

interface EditModalProps {
  template: Partial<NoteTemplate>;
  onSave: (t: NoteTemplate) => void;
  onClose: () => void;
  allTypes: string[];
}

function EditModal({ template, onSave, onClose, allTypes }: EditModalProps) {
  const [name, setName] = useState(template.name ?? '');
  const [description, setDescription] = useState(template.description ?? '');
  const [type, setType] = useState<string>(template.type ?? 'idea');
  const [content, setContent] = useState(template.content ?? '');
  const [tagsRaw, setTagsRaw] = useState((template.tags ?? []).join(', '));

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: template.id ?? nanoid(),
      name: name.trim(),
      description: description.trim(),
      type,
      content,
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: template.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-lg font-bold">{template.id ? 'Edit template' : 'New template'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {allTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma-separated)</label>
            <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="tag1, tag2" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Content <span className="text-muted-foreground/60">(use {'{title}'} and {'{date}'} as placeholders)</span>
            </label>
            <div className="border border-border rounded-lg overflow-hidden" style={{ height: 280 }}>
              <MarkdownEditor value={content} onChange={setContent} placeholder="Write your template here…" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Save template
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const { templates, addTemplate, updateTemplate, deleteTemplate, notes, setNotes, setActiveNotePath, customTypes } = useVaultStore();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<NoteTemplate> | null>(null);
  const [creatingFrom, setCreatingFrom] = useState<NoteTemplate | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('');

  const allTypes = ['research', 'idea', 'reference', 'synthesis', 'task', 'journal', ...customTypes];

  const handleCreateNote = async (tmpl: NoteTemplate, title: string, folder: string) => {
    const noteName = title.trim() || tmpl.name;
    const folderPath = folder.trim();
    const filePath = folderPath ? `${folderPath}/${noteName}.md` : `${noteName}.md`;
    const content = fillTemplate(tmpl.content, noteName);
    const now = new Date().toISOString();
    const newNote: Note = {
      path: filePath,
      title: noteName,
      content,
      type: tmpl.type,
      tags: [...tmpl.tags],
      connections: [],
      position: { x: 0, y: 0 },
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (githubClient.isInitialized()) {
        const serialized = githubClient.serializeMarkdown(newNote);
        const sha = await githubClient.saveFile(filePath, serialized, undefined, `New note from template: ${tmpl.name}`);
        newNote.sha = sha as string | undefined;
      }
      setNotes({ ...useVaultStore.getState().notes, [filePath]: newNote });
      setActiveNotePath(filePath);
      setCreatingFrom(null);
      setLocation('/');
    } catch (e: any) {
      toast({ title: 'Failed to create note', description: e.message, variant: 'destructive' });
    }
  };

  const isDefault = (t: NoteTemplate) => DEFAULT_TEMPLATES.some((d) => d.id === t.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Templates</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Reusable note structures</p>
          </div>
        </div>
        <Button onClick={() => setEditing({})} className="gap-2">
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-sm text-foreground">{tmpl.name}</span>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', typeColor(tmpl.type))}>
                  {tmpl.type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tmpl.description}</p>
              {tmpl.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tmpl.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => { setCreatingFrom(tmpl); setNewTitle(''); setNewFolder(''); }}
                >
                  <Plus className="h-3 w-3" />
                  Use template
                </Button>
                {!isDefault(tmpl) && (
                  <>
                    <button
                      onClick={() => setEditing(tmpl)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {isDefault(tmpl) && (
                  <button
                    onClick={() => setEditing(tmpl)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
                    title="Edit copy"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing !== null && (
        <EditModal
          template={editing}
          allTypes={allTypes}
          onSave={(t) => {
            if (editing.id) updateTemplate(editing.id, t);
            else addTemplate(t);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Use template modal */}
      {creatingFrom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold">Create from "{creatingFrom.name}"</h2>
              <button onClick={() => setCreatingFrom(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Note title</label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={creatingFrom.name}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNote(creatingFrom, newTitle, newFolder); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Folder (optional)</label>
              <Input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="e.g. research/books"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreatingFrom(null)}>Cancel</Button>
              <Button onClick={() => handleCreateNote(creatingFrom, newTitle, newFolder)} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Create note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
