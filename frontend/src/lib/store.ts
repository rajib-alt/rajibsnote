import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const BUILT_IN_TYPES = ['research', 'idea', 'reference', 'synthesis', 'task', 'journal'] as const;
export type BuiltInNoteType = (typeof BUILT_IN_TYPES)[number];
export type NoteType = string;

export type SidebarPanel = 'explorer' | 'tags' | null;

export interface Note {
  path: string;
  title: string;
  content: string;
  type: NoteType;
  tags: string[];
  aiAnnotation?: string;
  summary?: string;
  connections: string[];
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
  sha?: string;
  starred?: boolean;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Settings {
  githubPAT: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  theme: 'light' | 'dark';
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  resources: string[];
  isOptional: boolean;
  completed: boolean;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  duration: string | null;
  steps: RoadmapStep[];
}

export interface Roadmap {
  id: string;
  topic: string;
  title: string;
  description: string;
  estimatedTime: string | null;
  phases: RoadmapPhase[];
  createdAt: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  type: NoteType;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { path: string; title: string; excerpt: string }[];
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface VaultStore {
  notes: Record<string, Note>;
  canvasState: CanvasState;
  settings: Settings;
  customTypes: string[];
  roadmaps: Roadmap[];
  templates: NoteTemplate[];
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  // Sidebar
  sidebarPanel: SidebarPanel;
  sidebarWidth: number;
  // File explorer state
  expandedFolders: string[];
  activeNotePath: string | null;
  // Tag filter
  activeTagFilter: string | null;
  // Actions
  setNotes: (notes: Record<string, Note>) => void;
  updateNote: (path: string, note: Partial<Note>) => void;
  deleteNote: (path: string) => void;
  setCanvasState: (state: Partial<CanvasState>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  toggleFolder: (path: string) => void;
  setExpandedFolders: (folders: string[]) => void;
  setActiveNotePath: (path: string | null) => void;
  addCustomType: (type: string) => void;
  removeCustomType: (type: string) => void;
  addRoadmap: (roadmap: Roadmap) => void;
  updateRoadmapStep: (roadmapId: string, phaseId: string, stepId: string, completed: boolean) => void;
  deleteRoadmap: (roadmapId: string) => void;
  toggleStarred: (path: string) => void;
  setActiveTagFilter: (tag: string | null) => void;
  // Templates
  addTemplate: (template: NoteTemplate) => void;
  updateTemplate: (id: string, template: Partial<NoteTemplate>) => void;
  deleteTemplate: (id: string) => void;
  // Chat
  addChatSession: (session: ChatSession) => void;
  setActiveChatSession: (id: string | null) => void;
  addChatMessage: (sessionId: string, message: ChatMessage) => void;
  updateChatSession: (sessionId: string, update: Partial<ChatSession>) => void;
  deleteChatSession: (sessionId: string) => void;
}

export const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Structured notes for meetings',
    type: 'reference',
    tags: ['meeting'],
    content: `# Meeting: {title}

**Date:** {date}
**Attendees:** 

## Agenda

- 

## Discussion

## Decisions

## Action Items

- [ ] 

## Next Steps

`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'book-review',
    name: 'Book Review',
    description: 'Template for book notes and reviews',
    type: 'reference',
    tags: ['book', 'reading'],
    content: `# Book: {title}

**Author:** 
**Status:** Reading / Finished
**Rating:** ⭐⭐⭐⭐⭐

## Summary

## Key Ideas

1. 
2. 
3. 

## Favourite Quotes

> 

## How it connects to my thinking

## Action items from this book

- [ ] 
`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'project-brief',
    name: 'Project Brief',
    description: 'Kickoff brief for a new project',
    type: 'research',
    tags: ['project'],
    content: `# Project: {title}

**Status:** Planning
**Start date:** {date}

## Problem statement

## Goals

- 
- 

## Non-goals

## Key decisions

## Resources & references

## Notes

`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'daily-note',
    name: 'Daily Note',
    description: 'Daily journal / log',
    type: 'journal',
    tags: ['daily'],
    content: `# {date}

## Morning intention

What matters most today?

## Today's focus

- [ ] 
- [ ] 
- [ ] 

## Notes & captures

## Evening reflection

What went well? What did I learn?

`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'idea',
    name: 'Idea',
    description: 'Capture a new idea',
    type: 'idea',
    tags: ['idea'],
    content: `# {title}

## The idea

## Why it matters

## Related ideas

## Next steps

- [ ] 
`,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'literature-note',
    name: 'Literature Note',
    description: 'Notes from an article, paper, or resource',
    type: 'research',
    tags: ['literature'],
    content: `# {title}

**Source:** 
**Author:** 
**Date read:** {date}

## Summary

## Key points

1. 
2. 

## My thoughts

## Connections to my notes

`,
    createdAt: new Date().toISOString(),
  },
];

export const useVaultStore = create<VaultStore>()(
  persist(
    (set) => ({
      notes: {},
      canvasState: { zoom: 1, panX: 0, panY: 0 },
      settings: {
        githubPAT: '',
        repoOwner: '',
        repoName: '',
        defaultBranch: 'main',
        theme: 'light',
      },
      customTypes: [],
      roadmaps: [],
      templates: DEFAULT_TEMPLATES,
      chatSessions: [],
      activeChatSessionId: null,
      sidebarPanel: 'explorer',
      sidebarWidth: 260,
      expandedFolders: [],
      activeNotePath: null,
      activeTagFilter: null,
      setNotes: (notes) => set({ notes }),
      updateNote: (path, note) =>
        set((state) => ({
          notes: {
            ...state.notes,
            [path]: { ...state.notes[path], ...note },
          },
        })),
      deleteNote: (path) =>
        set((state) => {
          const newNotes = { ...state.notes };
          delete newNotes[path];
          return {
            notes: newNotes,
            activeNotePath: state.activeNotePath === path ? null : state.activeNotePath,
          };
        }),
      setCanvasState: (canvasState) =>
        set((state) => ({ canvasState: { ...state.canvasState, ...canvasState } })),
      setSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),
      setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
      toggleFolder: (path) =>
        set((state) => ({
          expandedFolders: state.expandedFolders.includes(path)
            ? state.expandedFolders.filter((f) => f !== path)
            : [...state.expandedFolders, path],
        })),
      setExpandedFolders: (folders) => set({ expandedFolders: folders }),
      setActiveNotePath: (path) => set({ activeNotePath: path }),
      addCustomType: (type) =>
        set((state) => ({
          customTypes: state.customTypes.includes(type)
            ? state.customTypes
            : [...state.customTypes, type.toLowerCase().trim()],
        })),
      removeCustomType: (type) =>
        set((state) => ({
          customTypes: state.customTypes.filter((t) => t !== type),
        })),
      addRoadmap: (roadmap) =>
        set((state) => ({ roadmaps: [roadmap, ...state.roadmaps] })),
      updateRoadmapStep: (roadmapId, phaseId, stepId, completed) =>
        set((state) => ({
          roadmaps: state.roadmaps.map((r) =>
            r.id !== roadmapId
              ? r
              : {
                  ...r,
                  phases: r.phases.map((p) =>
                    p.id !== phaseId
                      ? p
                      : {
                          ...p,
                          steps: p.steps.map((s) =>
                            s.id !== stepId ? s : { ...s, completed }
                          ),
                        }
                  ),
                }
          ),
        })),
      deleteRoadmap: (roadmapId) =>
        set((state) => ({
          roadmaps: state.roadmaps.filter((r) => r.id !== roadmapId),
        })),
      toggleStarred: (path) =>
        set((state) => ({
          notes: {
            ...state.notes,
            [path]: { ...state.notes[path], starred: !state.notes[path]?.starred },
          },
        })),
      setActiveTagFilter: (tag) => set({ activeTagFilter: tag }),
      addTemplate: (template) =>
        set((state) => ({ templates: [...state.templates, template] })),
      updateTemplate: (id, update) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...update } : t)),
        })),
      deleteTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
      addChatSession: (session) =>
        set((state) => ({ chatSessions: [session, ...state.chatSessions], activeChatSessionId: session.id })),
      setActiveChatSession: (id) => set({ activeChatSessionId: id }),
      addChatMessage: (sessionId, message) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id !== sessionId
              ? s
              : { ...s, messages: [...s.messages, message], updatedAt: new Date().toISOString() }
          ),
        })),
      updateChatSession: (sessionId, update) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id !== sessionId ? s : { ...s, ...update }
          ),
        })),
      deleteChatSession: (sessionId) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
          activeChatSessionId:
            state.activeChatSessionId === sessionId ? null : state.activeChatSessionId,
        })),
    }),
    {
      name: 'vault-canvas-storage',
      partialize: (state) => ({
        settings: state.settings,
        canvasState: state.canvasState,
        expandedFolders: state.expandedFolders,
        sidebarPanel: state.sidebarPanel,
        customTypes: state.customTypes,
        roadmaps: state.roadmaps,
        templates: state.templates,
        chatSessions: state.chatSessions,
        activeChatSessionId: state.activeChatSessionId,
        activeTagFilter: state.activeTagFilter,
      }),
    }
  )
);
