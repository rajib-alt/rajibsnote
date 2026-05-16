import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVaultStore, Note } from '@/lib/store';
import { buildTree, getDisplayName, type TreeNode } from '@/lib/file-tree';
import { githubClient } from '@/lib/github';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface FileTreeProps {
  onNoteSelect?: (path: string) => void;
}

export function FileTree({ onNoteSelect }: FileTreeProps) {
  const { notes, expandedFolders, toggleFolder, activeNotePath, setActiveNotePath, setNotes, updateNote, deleteNote } =
    useVaultStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingIn, setCreatingIn] = useState<{ folder: string; type: 'file' | 'folder' } | null>(null);
  const [createValue, setCreateValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // Gather all known paths: from notes + from folder structure
  const notePaths = Object.keys(notes);

  // Also collect implicit folder paths from note paths
  const allPaths: string[] = [];
  for (const path of notePaths) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      allPaths.push(parts.slice(0, i).join('/'));
    }
    allPaths.push(path);
  }
  const uniquePaths = [...new Set(allPaths)];
  const tree = buildTree(uniquePaths);

  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  useEffect(() => {
    if (creatingIn && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingIn]);

  const handleNoteClick = (path: string) => {
    setActiveNotePath(path);
    setLocation('/');
    onNoteSelect?.(path);
  };

  const startRename = (node: TreeNode) => {
    setRenamingPath(node.path);
    setRenameValue(
      node.type === 'file' ? getDisplayName(node.name) : node.name
    );
  };

  const commitRename = async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }
    const note = notes[renamingPath];
    if (!note) {
      setRenamingPath(null);
      return;
    }

    const parts = renamingPath.split('/');
    parts[parts.length - 1] = renameValue.trim() + '.md';
    const newPath = parts.join('/');

    if (newPath === renamingPath) {
      setRenamingPath(null);
      return;
    }

    try {
      const content = githubClient.serializeMarkdown({ ...note, title: renameValue.trim() });
      if (githubClient.isInitialized() && note.sha) {
        await githubClient.renameFile(renamingPath, newPath, content, note.sha);
      }
      const newNote: Note = { ...note, path: newPath, title: renameValue.trim() };
      deleteNote(renamingPath);
      updateNote(newPath, newNote);
      if (activeNotePath === renamingPath) setActiveNotePath(newPath);
    } catch (e: any) {
      toast({ title: 'Rename failed', description: e.message, variant: 'destructive' });
    }
    setRenamingPath(null);
  };

  const handleDeleteNote = async (path: string) => {
    const note = notes[path];
    if (!note) return;
    try {
      if (githubClient.isInitialized() && note.sha) {
        await githubClient.deleteFile(path, note.sha);
      }
      deleteNote(path);
      toast({ title: 'Note deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const startCreate = (folder: string, type: 'file' | 'folder') => {
    if (!expandedFolders.includes(folder)) toggleFolder(folder);
    setCreatingIn({ folder, type });
    setCreateValue('');
  };

  const commitCreate = async () => {
    if (!creatingIn || !createValue.trim()) {
      setCreatingIn(null);
      return;
    }

    const { folder, type } = creatingIn;
    const basePath = folder ? `${folder}/` : '';

    if (type === 'folder') {
      const folderPath = `${basePath}${createValue.trim()}`;
      try {
        if (githubClient.isInitialized()) {
          await githubClient.createFolder(folderPath);
        }
        toast({ title: 'Folder created', description: folderPath });
      } catch (e: any) {
        toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
      }
    } else {
      const name = createValue.trim().endsWith('.md')
        ? createValue.trim()
        : `${createValue.trim()}.md`;
      const filePath = `${basePath}${name}`;
      const title = name.replace('.md', '');
      const now = new Date().toISOString();
      const newNote: Note = {
        path: filePath,
        title,
        content: '',
        type: 'idea',
        tags: [],
        connections: [],
        position: { x: 0, y: 0 },
        createdAt: now,
        updatedAt: now,
      };

      try {
        if (githubClient.isInitialized()) {
          const content = githubClient.serializeMarkdown(newNote);
          const sha = await githubClient.saveFile(filePath, content, undefined, `Create ${filePath}`);
          newNote.sha = sha;
        }
        setNotes({ ...useVaultStore.getState().notes, [filePath]: newNote });
        setActiveNotePath(filePath);
        setLocation('/');
      } catch (e: any) {
        toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
      }
    }

    setCreatingIn(null);
  };

  const startCreateAtRoot = (type: 'file' | 'folder') => {
    setCreatingIn({ folder: '', type });
    setCreateValue('');
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Explorer header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCreateAtRoot('file')}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            title="New note"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => startCreateAtRoot('folder')}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <p>No notes yet.</p>
            <button
              onClick={() => startCreateAtRoot('file')}
              className="mt-2 text-primary hover:underline"
            >
              Create your first note
            </button>
          </div>
        )}
        {creatingIn?.folder === '' && (
          <CreateInput
            type={creatingIn.type}
            ref={createInputRef}
            value={createValue}
            onChange={setCreateValue}
            onCommit={commitCreate}
            onCancel={() => setCreatingIn(null)}
            depth={0}
          />
        )}
        {tree.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            activeNotePath={activeNotePath}
            renamingPath={renamingPath}
            renameValue={renameValue}
            renameInputRef={renameInputRef}
            setRenameValue={setRenameValue}
            onNoteClick={handleNoteClick}
            onRenameStart={startRename}
            onRenameCommit={commitRename}
            onRenameCancel={() => setRenamingPath(null)}
            onDelete={handleDeleteNote}
            onCreateIn={startCreate}
            creatingIn={creatingIn}
            createValue={createValue}
            setCreateValue={setCreateValue}
            createInputRef={createInputRef}
            onCreateCommit={commitCreate}
            onCreateCancel={() => setCreatingIn(null)}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  expandedFolders: string[];
  toggleFolder: (path: string) => void;
  activeNotePath: string | null;
  renamingPath: string | null;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setRenameValue: (v: string) => void;
  onNoteClick: (path: string) => void;
  onRenameStart: (node: TreeNode) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onDelete: (path: string) => void;
  onCreateIn: (folder: string, type: 'file' | 'folder') => void;
  creatingIn: { folder: string; type: 'file' | 'folder' } | null;
  createValue: string;
  setCreateValue: (v: string) => void;
  createInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateCommit: () => void;
  onCreateCancel: () => void;
}

function TreeNodeItem({
  node,
  depth,
  expandedFolders,
  toggleFolder,
  activeNotePath,
  renamingPath,
  renameValue,
  renameInputRef,
  setRenameValue,
  onNoteClick,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onDelete,
  onCreateIn,
  creatingIn,
  createValue,
  setCreateValue,
  createInputRef,
  onCreateCommit,
  onCreateCancel,
}: TreeNodeItemProps) {
  const isExpanded = expandedFolders.includes(node.path);
  const isActive = activeNotePath === node.path;
  const isRenaming = renamingPath === node.path;
  const indentPx = depth * 12 + 8;

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className={cn(
            'group flex items-center gap-1 py-[3px] pr-2 rounded cursor-pointer hover:bg-sidebar-accent/70 transition-colors',
          )}
          style={{ paddingLeft: `${indentPx}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          <span className="text-muted-foreground shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="text-muted-foreground shrink-0">
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5" />
            ) : (
              <Folder className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="text-sm text-sidebar-foreground flex-1 truncate">{node.name}</span>
          <FolderActions
            onNewFile={() => onCreateIn(node.path, 'file')}
            onNewFolder={() => onCreateIn(node.path, 'folder')}
          />
        </div>

        {isExpanded && (
          <div>
            {creatingIn?.folder === node.path && (
              <CreateInput
                type={creatingIn.type}
                ref={createInputRef}
                value={createValue}
                onChange={setCreateValue}
                onCommit={onCreateCommit}
                onCancel={onCreateCancel}
                depth={depth + 1}
              />
            )}
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                activeNotePath={activeNotePath}
                renamingPath={renamingPath}
                renameValue={renameValue}
                renameInputRef={renameInputRef}
                setRenameValue={setRenameValue}
                onNoteClick={onNoteClick}
                onRenameStart={onRenameStart}
                onRenameCommit={onRenameCommit}
                onRenameCancel={onRenameCancel}
                onDelete={onDelete}
                onCreateIn={onCreateIn}
                creatingIn={creatingIn}
                createValue={createValue}
                setCreateValue={setCreateValue}
                createInputRef={createInputRef}
                onCreateCommit={onCreateCommit}
                onCreateCancel={onCreateCancel}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 py-[3px] pr-2 rounded cursor-pointer transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
      )}
      style={{ paddingLeft: `${indentPx + 12}px` }}
      onClick={() => !isRenaming && onNoteClick(node.path)}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {isRenaming ? (
        <input
          ref={renameInputRef}
          className="flex-1 text-sm bg-transparent outline-none border-b border-primary"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-sm flex-1 truncate">
          {getDisplayName(node.name)}
        </span>
      )}
      {!isRenaming && (
        <FileActions
          onRename={() => onRenameStart(node)}
          onDelete={() => onDelete(node.path)}
        />
      )}
    </div>
  );
}

function FolderActions({
  onNewFile,
  onNewFolder,
}: {
  onNewFile: () => void;
  onNewFolder: () => void;
}) {
  return (
    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
      <button
        onClick={(e) => { e.stopPropagation(); onNewFile(); }}
        className="h-4 w-4 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
        title="New note"
      >
        <Plus className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNewFolder(); }}
        className="h-4 w-4 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
        title="New folder"
      >
        <FolderPlus className="h-3 w-3" />
      </button>
    </div>
  );
}

function FileActions({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CreateInputProps {
  type: 'file' | 'folder';
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  depth: number;
  ref: React.RefObject<HTMLInputElement | null>;
}

function CreateInput({ type, value, onChange, onCommit, onCancel, depth, ref }: CreateInputProps) {
  const indentPx = depth * 12 + 8 + (type === 'file' ? 12 : 0);
  return (
    <div
      className="flex items-center gap-1.5 py-[3px] pr-2"
      style={{ paddingLeft: `${indentPx}px` }}
    >
      {type === 'file' ? (
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <input
        ref={ref}
        className="flex-1 text-sm bg-sidebar-accent/50 rounded px-1 outline-none border border-primary/40"
        value={value}
        placeholder={type === 'file' ? 'note-name.md' : 'folder-name'}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
      />
    </div>
  );
}
