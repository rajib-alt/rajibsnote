import { useState, useEffect, useRef, useCallback } from 'react';
import { useVaultStore, Note, NoteType, BUILT_IN_TYPES } from '@/lib/store';
import { githubClient } from '@/lib/github';
import { useGithub } from '@/hooks/use-github';
import { useAnnotateNote, useSuggestPlacement } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { MarkdownEditor, toolbarActions } from '@/components/editor/MarkdownEditor';
import { MarkdownPreview } from '@/components/editor/MarkdownPreview';
import { BacklinksPanel } from '@/components/editor/BacklinksPanel';
import type { EditorView } from '@uiw/react-codemirror';
import {
  Sparkles,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Hash,
  X,
  Link as LinkIcon,
  FolderOpen,
  Plus,
  Check,
  Eye,
  Pencil,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TYPE_PALETTE: Record<string, string> = {
  research: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  idea: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  reference: 'bg-chart-2/15 text-chart-2 border-chart-2/30',
  synthesis: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  task: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  journal: 'bg-primary/10 text-primary border-primary/20',
};

function typeColor(type: string): string {
  return TYPE_PALETTE[type] ?? 'bg-muted/60 text-muted-foreground border-border';
}

const TOOLBAR_STYLES: Record<string, string> = {
  B: 'font-bold',
  I: 'italic',
  S: 'line-through',
};

interface AISuggestion {
  suggestedFolder: string;
  backlinks: { path: string; title: string; reason: string }[];
  reasoning: string;
}

export default function NoteEditorPage() {
  const { activeNotePath, notes, updateNote, deleteNote, setActiveNotePath, customTypes, addCustomType, toggleStarred } =
    useVaultStore();
  const { saveNote: saveToGithub } = useGithub();
  const { toast } = useToast();
  const annotateNote = useAnnotateNote();
  const suggestPlacement = useSuggestPlacement();
  const editorViewRef = useRef<EditorView | null>(null);

  const note = activeNotePath ? notes[activeNotePath] : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('idea');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [aiAnnotation, setAiAnnotation] = useState('');
  const [metaExpanded, setMetaExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [aiPanel, setAiPanel] = useState<AISuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setType(note.type);
      setTags(note.tags || []);
      setAiAnnotation(note.aiAnnotation || '');
      setIsDirty(false);
      setAiPanel(null);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }
  }, [note?.path]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [title]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(autoSave, 2000);
  }, []);

  const buildUpdatedNote = useCallback(
    (overrides: Partial<Note> = {}): Note | null => {
      if (!note || !activeNotePath) return null;
      return {
        ...note,
        title: title || 'Untitled',
        content: contentRef.current,
        type,
        tags,
        aiAnnotation,
        updatedAt: new Date().toISOString(),
        ...overrides,
      };
    },
    [note, activeNotePath, title, type, tags, aiAnnotation]
  );

  const autoSave = useCallback(async () => {
    const updated = buildUpdatedNote();
    if (!updated || !activeNotePath) return;
    updateNote(activeNotePath, updated);
    if (githubClient.isInitialized()) {
      try {
        const serialized = githubClient.serializeMarkdown(updated);
        const newSha = await saveToGithub(activeNotePath, serialized, updated.sha);
        if (newSha) updateNote(activeNotePath, { sha: newSha });
      } catch {}
    }
    setIsDirty(false);
  }, [buildUpdatedNote, activeNotePath]);

  const handleSave = useCallback(
    async (silent = false) => {
      if (!note || !activeNotePath || isSaving) return;
      setIsSaving(true);
      const updated = buildUpdatedNote();
      if (!updated) { setIsSaving(false); return; }
      updateNote(activeNotePath, updated);
      try {
        if (githubClient.isInitialized()) {
          const serialized = githubClient.serializeMarkdown(updated);
          const newSha = await saveToGithub(activeNotePath, serialized, note.sha);
          if (newSha) updateNote(activeNotePath, { sha: newSha });
        }
        if (!silent) toast({ title: 'Saved' });
        setIsDirty(false);
      } catch (e: any) {
        if (!silent) toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    },
    [note, activeNotePath, isSaving, buildUpdatedNote]
  );

  const handleDelete = async () => {
    if (!note || !activeNotePath) return;
    try {
      if (githubClient.isInitialized() && note.sha) {
        await githubClient.deleteFile(activeNotePath, note.sha);
      }
      deleteNote(activeNotePath);
      setActiveNotePath(null);
      toast({ title: 'Note deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleAnnotate = async () => {
    if (!note) return;
    try {
      const result = await annotateNote.mutateAsync({
        data: {
          title: title || note.title,
          content: content || note.content,
          existingNotes: Object.values(notes)
            .filter((n) => n.path !== activeNotePath)
            .map((n) => ({ path: n.path, title: n.title })),
        },
      });
      setAiAnnotation(result.annotation);
      setType(result.type as NoteType);
      setTags(result.tags);
      markDirty();
      toast({ title: 'AI analysis complete' });
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleSuggestPlacement = async () => {
    if (!note) return;
    setIsAnalyzing(true);
    try {
      const folderSet = new Set<string>();
      Object.keys(notes).forEach((p) => {
        const parts = p.split('/');
        if (parts.length > 1) folderSet.add(parts.slice(0, -1).join('/'));
      });

      const result = await suggestPlacement.mutateAsync({
        data: {
          title: title || note.title,
          content: content || note.content,
          existingFolders: [...folderSet],
          existingNotes: Object.values(notes)
            .filter((n) => n.path !== activeNotePath)
            .map((n) => ({ path: n.path, title: n.title })),
        },
      });
      setAiPanel({
        suggestedFolder: result.suggestedFolder,
        backlinks: result.backlinks,
        reasoning: result.reasoning,
      });
    } catch (e: any) {
      toast({ title: 'Suggestion failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const acceptBacklink = (path: string, noteTitle: string) => {
    const wikilink = `[[${noteTitle}]]`;
    if (!content.includes(wikilink)) {
      const next = content + (content.endsWith('\n') ? '' : '\n') + '\n' + wikilink;
      setContent(next);
      markDirty();
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      markDirty();
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    markDirty();
  };

  const addNewType = () => {
    const t = newTypeInput.trim().toLowerCase();
    if (!t) return;
    addCustomType(t);
    setType(t);
    setShowAddType(false);
    setNewTypeInput('');
    markDirty();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const allTypes = [...BUILT_IN_TYPES, ...customTypes];

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="mx-auto mb-4 opacity-15 h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="text-sm">Select a note from the explorer</p>
          <p className="text-xs mt-1 opacity-50">or create a new one with the + button</p>
        </div>
      </div>
    );
  }

  const pathParts = activeNotePath?.split('/') || [];
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Main editor column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-8 pt-3 pb-0 text-xs text-muted-foreground/50 font-mono shrink-0">
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-40">/</span>}
              <span className={i === pathParts.length - 1 ? 'text-muted-foreground/80' : ''}>
                {i === pathParts.length - 1 ? part.replace('.md', '') : part}
              </span>
            </span>
          ))}
          {isDirty && (
            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary/50 inline-block animate-pulse" title="Unsaved changes" />
          )}
          <div className="ml-auto flex items-center gap-1">
            {/* Star toggle */}
            <button
              onClick={() => activeNotePath && toggleStarred(activeNotePath)}
              className={cn(
                'p-1 rounded hover:bg-muted transition-colors',
                note.starred ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
              )}
              title={note.starred ? 'Unstar' : 'Star this note'}
            >
              <Star className={cn('h-3.5 w-3.5', note.starred && 'fill-current')} />
            </button>
            {/* Preview toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={cn(
                    'p-1 rounded hover:bg-muted transition-colors',
                    previewMode ? 'text-primary bg-primary/10' : 'text-muted-foreground/60'
                  )}
                >
                  {previewMode ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {previewMode ? 'Switch to edit mode' : 'Preview rendered markdown'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 pt-3 pb-32">
            {/* Title */}
            {previewMode ? (
              <h1 className="font-serif text-[2.2rem] font-bold leading-tight text-foreground mb-4 mt-1">
                {title || 'Untitled'}
              </h1>
            ) : (
              <textarea
                ref={titleRef}
                rows={1}
                className="w-full resize-none bg-transparent font-serif text-[2.2rem] font-bold leading-tight text-foreground outline-none placeholder:text-muted-foreground/25 overflow-hidden mb-4 mt-1"
                placeholder="Untitled"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              />
            )}

            {/* Properties */}
            <div className="mb-5 border border-border/50 rounded-md overflow-hidden text-xs">
              <button
                onClick={() => setMetaExpanded(!metaExpanded)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-muted/25 hover:bg-muted/40 text-muted-foreground transition-colors"
              >
                {metaExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Properties
              </button>

              {metaExpanded && (
                <div className="divide-y divide-border/30">
                  {/* Type */}
                  <div className="flex items-center px-3 py-1.5 gap-4">
                    <span className="text-muted-foreground w-20 shrink-0">Type</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Select value={type} onValueChange={(v) => { setType(v); markDirty(); }}>
                        <SelectTrigger className="h-6 border-none bg-transparent p-0 shadow-none w-auto gap-1 focus:ring-0 text-xs">
                          <Badge variant="outline" className={cn('text-[10px] capitalize border font-normal', typeColor(type))}>
                            {type}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {allTypes.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs capitalize">
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full border', typeColor(t))} />
                                {t}
                              </div>
                            </SelectItem>
                          ))}
                          <div className="border-t border-border/40 mt-1 pt-1">
                            {showAddType ? (
                              <div className="flex items-center gap-1 px-2 pb-1">
                                <input
                                  autoFocus
                                  className="flex-1 text-xs bg-transparent outline-none border-b border-primary/40 py-0.5"
                                  placeholder="type name..."
                                  value={newTypeInput}
                                  onChange={(e) => setNewTypeInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') addNewType();
                                    if (e.key === 'Escape') { setShowAddType(false); setNewTypeInput(''); }
                                  }}
                                />
                                <button onClick={addNewType} className="text-primary hover:text-primary/80">
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground w-full"
                                onMouseDown={(e) => { e.preventDefault(); setShowAddType(true); }}
                              >
                                <Plus className="h-3 w-3" />
                                Add custom type
                              </button>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-start px-3 py-1.5 gap-4">
                    <span className="text-muted-foreground w-20 shrink-0 pt-0.5">Tags</span>
                    <div className="flex flex-wrap gap-1 flex-1 min-h-5">
                      {tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 bg-muted/60 text-muted-foreground rounded px-1.5 py-0.5">
                          <Hash className="h-2.5 w-2.5 shrink-0" />
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-destructive ml-0.5">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="bg-transparent outline-none placeholder:text-muted-foreground/40 min-w-16"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                        }}
                      />
                    </div>
                  </div>

                  {/* Modified */}
                  <div className="flex items-center px-3 py-1.5 gap-4">
                    <span className="text-muted-foreground w-20 shrink-0">Modified</span>
                    <span className="text-muted-foreground">{new Date(note.updatedAt).toLocaleString()}</span>
                  </div>

                  {/* AI annotation */}
                  {aiAnnotation && (
                    <div className="flex items-start px-3 py-1.5 gap-4">
                      <span className="text-muted-foreground w-20 shrink-0 flex items-center gap-1 pt-0.5">
                        <Sparkles className="h-2.5 w-2.5" />AI
                      </span>
                      <p className="italic text-primary/65 flex-1 leading-relaxed">{aiAnnotation}</p>
                    </div>
                  )}

                  {/* Connections */}
                  {note.connections.length > 0 && (
                    <div className="flex items-start px-3 py-1.5 gap-4">
                      <span className="text-muted-foreground w-20 shrink-0 flex items-center gap-1 pt-0.5">
                        <LinkIcon className="h-2.5 w-2.5" />Links
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {note.connections.map((c) => (
                          <span key={c} className="text-primary/65 hover:text-primary cursor-pointer underline underline-offset-2">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI placement suggestions panel */}
            {aiPanel && (
              <div className="mb-5 border border-primary/20 rounded-md bg-primary/5 overflow-hidden text-xs">
                <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/15">
                  <span className="flex items-center gap-1.5 font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    AI Suggestions
                  </span>
                  <button onClick={() => setAiPanel(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground font-medium mb-0.5">Suggested folder</p>
                      <code className="text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                        {aiPanel.suggestedFolder || '(root)'}
                      </code>
                      <p className="text-muted-foreground/70 mt-1 leading-relaxed">{aiPanel.reasoning}</p>
                    </div>
                  </div>

                  {aiPanel.backlinks.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 text-muted-foreground font-medium mb-1.5">
                        <LinkIcon className="h-3 w-3" />
                        Suggested backlinks
                      </p>
                      <div className="space-y-1.5">
                        {aiPanel.backlinks.map((bl) => (
                          <div key={bl.path} className="flex items-start gap-2 rounded bg-background/60 p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium truncate">{bl.title}</p>
                              <p className="text-muted-foreground/70 leading-relaxed mt-0.5">{bl.reason}</p>
                            </div>
                            <button
                              onClick={() => acceptBacklink(bl.path, bl.title)}
                              className="shrink-0 text-primary/70 hover:text-primary text-[10px] border border-primary/30 hover:border-primary/60 rounded px-1.5 py-0.5 transition-colors"
                            >
                              Insert [[link]]
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Formatting toolbar — only in edit mode */}
            {!previewMode && (
              <div className="flex items-center gap-0.5 mb-3 flex-wrap border-b border-border/30 pb-2">
                {toolbarActions.map((action) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (editorViewRef.current) {
                            action.action(editorViewRef.current);
                            editorViewRef.current.focus();
                          }
                        }}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors font-mono leading-none',
                          TOOLBAR_STYLES[action.label]
                        )}
                      >
                        {action.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{action.title}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Editor / Preview */}
            {previewMode ? (
              <MarkdownPreview content={content} className="min-h-[60vh]" />
            ) : (
              <div className="min-h-[60vh]">
                <MarkdownEditor
                  key={note.path}
                  value={content}
                  onChange={(val) => { setContent(val); markDirty(); }}
                  placeholder="Start writing... Type [[ to link to another note."
                  editorRef={editorViewRef}
                  noteTitles={Object.values(notes).filter(n => n.path !== activeNotePath).map(n => n.title)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-8 py-1.5 border-t border-border/40 bg-background/90 backdrop-blur-sm text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{content.length} chars</span>
            {isDirty && <span className="text-primary/60 italic">Unsaved</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground hover:text-destructive px-2" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs px-2"
              onClick={handleSuggestPlacement}
              disabled={isAnalyzing}
            >
              <FolderOpen className="h-3 w-3" />
              {isAnalyzing ? 'Thinking...' : 'AI Place'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs px-2"
              onClick={handleAnnotate}
              disabled={annotateNote.isPending}
            >
              <Sparkles className="h-3 w-3" />
              {annotateNote.isPending ? 'Analyzing...' : 'AI Analyze'}
            </Button>
            <Button size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => handleSave(false)} disabled={isSaving}>
              <Save className="h-3 w-3" />{isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Right column: backlinks panel */}
      {activeNotePath && (
        <div className="w-60 border-l border-border bg-sidebar shrink-0 overflow-y-auto hidden lg:block">
          <BacklinksPanel currentPath={activeNotePath} />
        </div>
      )}
    </div>
  );
}
